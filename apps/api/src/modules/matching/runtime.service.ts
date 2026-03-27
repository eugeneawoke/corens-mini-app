import { Injectable, NotFoundException } from "@nestjs/common";
import {
  evaluateMatchingCandidate,
  lightStateKeys,
  shadowStateKeys,
  type ConnectionSummary,
  type MatchingCandidate
} from "@corens/domain";
import { Prisma } from "@corens/db";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import type { AuthenticatedUserContext } from "../auth/service";
import { ConsentRuntimeService } from "../consents/runtime.service";
import { ProfilesService } from "../profiles";
import { BotNotificationService } from "../../telegram/bot-notification.service";

type ActiveConnectionSummary = Extract<ConnectionSummary, { kind: "active" }>;
type PeerDeletedConnectionSummary = Extract<ConnectionSummary, { kind: "peer_deleted" }>;

type RawSession = { id: string; userAId: string; userBId: string; origin: string; score: number | null; pairKey: string };

@Injectable()
export class MatchingRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly policyConfig: PolicyConfigService,
    private readonly consents: ConsentRuntimeService,
    private readonly notifications: BotNotificationService
  ) {}

  // Returns the full list of connections (active + one peer_deleted if any)
  async getConnections(user: AuthenticatedUserContext): Promise<ConnectionSummary[]> {
    const record = await this.profiles.getCurrentProfileRecord(user);

    // Try to fill slots before building the response
    await this.ensureMatchFill(record.user.id);

    const activeSessions = await this.prisma.clientInstance.matchSession.findMany({
      where: {
        status: "active",
        OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
      },
      orderBy: { createdAt: "desc" }
    });

    const results: ConnectionSummary[] = [];

    for (const session of activeSessions) {
      const summary = await this.buildActiveConnectionSummary(
        record.user.id,
        record.profile,
        session
      );
      results.push(summary);
    }

    // Show one peer_deleted notice if no active connections
    if (results.length === 0) {
      const peerDeletedSession = await this.prisma.clientInstance.matchSession.findFirst({
        where: {
          status: "closed_peer_deleted",
          OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
        },
        orderBy: { expiresAt: "desc" }
      });

      if (peerDeletedSession) {
        results.push(this.buildPeerDeletedSummary());
      }
    }

    return results;
  }

  // Returns a single connection by session ID (no match creation side-effect)
  async getConnectionById(
    user: AuthenticatedUserContext,
    sessionId: string
  ): Promise<ConnectionSummary | null> {
    const record = await this.profiles.getCurrentProfileRecord(user);
    const session = await this.prisma.clientInstance.matchSession.findFirst({
      where: {
        id: sessionId,
        OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
      }
    });

    if (!session) {
      return null;
    }

    if (session.status === "closed_peer_deleted") {
      return this.buildPeerDeletedSummary();
    }

    if (session.status === "closed_blocked" || session.status === "closed_reported") {
      return null;
    }

    return this.buildActiveConnectionSummary(record.user.id, record.profile, session);
  }

  async sweep(): Promise<void> {
    const users = await this.prisma.clientInstance.user.findMany({
      where: {
        status: "active",
        profile: {
          is: {
            onboardingCompleted: true
          }
        }
      },
      select: { id: true }
    });

    for (const user of users) {
      await this.ensureMatchFill(user.id);
    }
  }

  private async buildActiveConnectionSummary(
    userId: string,
    profile: {
      stateKey: string;
      trustKeys: string[];
    },
    session: RawSession
  ): Promise<ActiveConnectionSummary | PeerDeletedConnectionSummary> {
    const peerUserId = session.userAId === userId ? session.userBId : session.userAId;
    const peer = await this.prisma.clientInstance.profile.findUnique({
      where: { userId: peerUserId },
      include: { user: true }
    });

    if (!peer) {
      return this.buildPeerDeletedSummary();
    }

    const sharedKeys = profile.trustKeys.filter((item) => peer.trustKeys.includes(item));
    const consentStatus = await this.consents.buildStatusForMatch(
      session.id,
      userId,
      peer.userId,
      {
        telegramUsername: peer.user.telegramUsername,
        telegramUserId: peer.user.telegramUserId
      }
    );

    return {
      kind: "active",
      id: session.id,
      displayName: peer.displayName,
      matchScore: session.score ?? 0,
      trustLevel: Math.max(1, Math.min(5, sharedKeys.length + 1)),
      sharedKeys,
      sharedState: this.buildSharedState(profile.stateKey, peer.stateKey),
      statusCopy:
        session.origin === "beacon"
          ? "Кто-то из вас зажёг маяк — и это помогло встрече состояться."
          : "Поиск нашёл вас сам — тихо и без усилий.",
      contactConsent: consentStatus.contact,
      photoConsent: consentStatus.photo
    };
  }

  private buildPeerDeletedSummary(): PeerDeletedConnectionSummary {
    return {
      kind: "peer_deleted",
      title: "Пользователь больше недоступен",
      description: "Эта связь закрылась, потому что другой человек полностью удалил аккаунт.",
      statusCopy: "Мы остановили открытые шаги и вернули вас к обычному поиску.",
      primaryActionLabel: "Вернуться к поиску"
    };
  }

  private buildSharedState(selfStateKey: string, peerStateKey: string): string {
    const selfIsLight = lightStateKeys.has(selfStateKey);
    const peerIsLight = lightStateKeys.has(peerStateKey);
    const selfIsShadow = shadowStateKeys.has(selfStateKey);
    const peerIsShadow = shadowStateKeys.has(peerStateKey);

    if (selfStateKey === peerStateKey) {
      return "Вы в одном настроении прямо сейчас";
    }
    if (selfIsShadow && peerIsShadow) {
      return this.pick([
        "Оба сейчас в тени — вы поймёте друг друга без слов",
        "Сейчас нелегко обоим — иногда достаточно просто быть рядом",
        "Оба переживаете что-то сложное — это само по себе связывает",
        "Непростой момент у обоих — есть с кем разделить"
      ]);
    }
    if ((selfIsLight && peerIsShadow) || (selfIsShadow && peerIsLight)) {
      return this.pick([
        "Разные состояния — иногда именно это даёт опору",
        "Один из вас в тени, другой в свете — можно дать поддержку",
        "Состояние разное, но это может быть именно то, что нужно"
      ]);
    }
    return this.pick([
      "Светлое состояние у обоих — но пришли к нему по-разному",
      "У обоих хорошо — посмотрим, что получится",
      "Одинаково светло, но по-разному — это редкость"
    ]);
  }

  private pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Fills connection slots up to the limit (one new match per call — sweep runs this periodically)
  private async ensureMatchFill(userId: string): Promise<void> {
    const scoring = await this.policyConfig.getMatchingScoring();
    const limit = scoring.limits.activeConnections;

    const existingActiveSessions = await this.prisma.clientInstance.matchSession.findMany({
      where: {
        status: "active",
        OR: [{ userAId: userId }, { userBId: userId }]
      }
    });

    if (existingActiveSessions.length >= limit) {
      return;
    }

    const self = await this.prisma.clientInstance.profile.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (!self || !self.onboardingCompleted || self.visibilityStatus === "hidden") {
      return;
    }

    const allProfiles = await this.prisma.clientInstance.profile.findMany({
      where: {
        onboardingCompleted: true,
        visibilityStatus: "active",
        userId: { not: userId }
      },
      include: { user: true }
    });

    if (allProfiles.length === 0) {
      return;
    }

    const [stateMatrix, intentMatrix] = await Promise.all([
      this.policyConfig.getMatchingStateMatrix(),
      this.policyConfig.getMatchingIntentMatrix()
    ]);

    // Load all active sessions globally (to compute per-user counts and check pair exclusions)
    const allActiveSessions = await this.prisma.clientInstance.matchSession.findMany({
      where: { status: "active" }
    });

    // Pairs that were explicitly blocked or reported — never re-match these
    const blockedPairKeys = new Set(
      (
        await this.prisma.clientInstance.matchSession.findMany({
          where: {
            status: { in: ["closed_blocked", "closed_reported"] },
            OR: [{ userAId: userId }, { userBId: userId }]
          },
          select: { pairKey: true }
        })
      ).map((s) => s.pairKey)
    );

    const activeBeaconUserIds = new Set(
      (
        await this.prisma.clientInstance.beaconSession.findMany({
          where: {
            status: "active",
            expiresAt: { gt: new Date() }
          },
          select: { userId: true }
        })
      ).map((item) => item.userId)
    );

    const activeCountByUser = new Map<string, number>();

    for (const session of allActiveSessions) {
      activeCountByUser.set(session.userAId, (activeCountByUser.get(session.userAId) ?? 0) + 1);
      activeCountByUser.set(session.userBId, (activeCountByUser.get(session.userBId) ?? 0) + 1);
    }

    // Build the set of pairKeys already active for this user (to exclude)
    const myActivePairKeys = new Set(existingActiveSessions.map((s) => s.pairKey));

    const selfCandidate = this.toCandidate(self, activeCountByUser.get(self.userId) ?? 0);
    let bestMatch:
      | {
          candidateUserId: string;
          score: number;
          origin: "automatic" | "beacon";
        }
      | undefined;

    for (const candidateProfile of allProfiles) {
      const pairKey = [self.userId, candidateProfile.userId].sort().join(":");
      const hasActivePairMatch = myActivePairKeys.has(pairKey);
      const hasPairExclusion = blockedPairKeys.has(pairKey);

      const candidate = this.toCandidate(
        candidateProfile,
        activeCountByUser.get(candidateProfile.userId) ?? 0
      );
      const evaluation = evaluateMatchingCandidate(
        {
          self: selfCandidate,
          candidate,
          moodScore: this.getCompatibilityScore(stateMatrix.compatibility, self.stateKey, candidateProfile.stateKey),
          intentScore: this.resolveIntentScore(
            intentMatrix.compatibility,
            this.normalizeOptionalIntent(self.intentKey),
            this.normalizeOptionalIntent(candidateProfile.intentKey)
          ),
          moodUpdatedRecently:
            Date.now() - self.updatedAt.getTime() < scoring.freshness.moodHours * 3_600_000,
          hasPairExclusion,
          hasActivePairMatch
        },
        scoring
      );

      if (!evaluation.isEligible) {
        continue;
      }

      const origin =
        activeBeaconUserIds.has(self.userId) || activeBeaconUserIds.has(candidateProfile.userId)
          ? "beacon"
          : "automatic";
      const totalScore =
        evaluation.score + (origin === "beacon" ? scoring.weights.noConnectionsBonus : 0);

      if (!bestMatch || totalScore > bestMatch.score) {
        bestMatch = {
          candidateUserId: candidateProfile.userId,
          score: totalScore,
          origin
        };
      }
    }

    if (!bestMatch) {
      return;
    }

    const [userAId, userBId] = [self.userId, bestMatch.candidateUserId].sort();

    let isNewMatch = false;

    await this.prisma.clientInstance.$transaction(async (tx) => {
      const activePair = await tx.matchSession.findFirst({
        where: {
          pairKey: `${userAId}:${userBId}`,
          status: "active"
        }
      });

      if (activePair) {
        return;
      }

      try {
        await tx.matchSession.create({
          data: {
            pairKey: `${userAId}:${userBId}`,
            userAId,
            userBId,
            origin: bestMatch!.origin,
            status: "active",
            score: bestMatch!.score
          }
        });
        isNewMatch = true;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return;
        }

        throw error;
      }
    });

    if (isNewMatch) {
      const [profileA, profileB] = await Promise.all([
        this.prisma.clientInstance.profile.findUnique({ where: { userId: userAId }, select: { displayName: true, user: { select: { telegramUserId: true } } } }),
        this.prisma.clientInstance.profile.findUnique({ where: { userId: userBId }, select: { displayName: true, user: { select: { telegramUserId: true } } } })
      ]);
      if (profileA) void this.notifications.notifyConnectionCreated(profileA.user.telegramUserId, profileB?.displayName ?? "Кто-то");
      if (profileB) void this.notifications.notifyConnectionCreated(profileB.user.telegramUserId, profileA?.displayName ?? "Кто-то");
    }
  }

  private toCandidate(
    profile: {
      userId: string;
      gender: string;
      partnerGender: string;
      stateKey: string;
      intentKey: string | null;
      trustKeys: string[];
      matchingEnabled: boolean;
      visibilityStatus: string;
      updatedAt: Date;
    },
    activeConnectionsCount: number
  ): MatchingCandidate & { updatedAt: Date } {
    return {
      userId: profile.userId,
      gender: profile.gender,
      partnerGender: profile.partnerGender,
      stateKey: profile.stateKey,
      intentKey: this.normalizeOptionalIntent(profile.intentKey),
      trustKeys: profile.trustKeys.map((item) => item.toLowerCase()),
      activeConnectionsCount,
      matchingEnabled: profile.matchingEnabled,
      isHidden: profile.visibilityStatus === "hidden",
      updatedAt: profile.updatedAt
    };
  }

  private normalizeOptionalIntent(intentKey: string | null): string | null {
    const normalized = intentKey?.trim() ?? "";
    return normalized.length > 0 ? normalized : null;
  }

  private resolveIntentScore(
    compatibility: Record<string, number>,
    left: string | null,
    right: string | null
  ): number {
    if (!left || !right) {
      return 0;
    }

    return this.getCompatibilityScore(compatibility, left, right);
  }

  private getCompatibilityScore(
    compatibility: Record<string, number>,
    left: string,
    right: string
  ): number {
    return compatibility[`${left}::${right}`] ?? -1;
  }
}

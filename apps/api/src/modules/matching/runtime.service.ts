import { Injectable } from "@nestjs/common";
import {
  evaluateMatchingCandidate,
  type ConnectionSummary,
  type MatchingCandidate
} from "@corens/domain";
import { Prisma } from "@corens/db";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import type { AuthenticatedUserContext } from "../auth/service";
import { ConsentRuntimeService } from "../consents/runtime.service";
import { ProfilesService } from "../profiles";

type ActiveConnectionSummary = Extract<ConnectionSummary, { kind: "active" }>;
type PeerDeletedConnectionSummary = Extract<ConnectionSummary, { kind: "peer_deleted" }>;

@Injectable()
export class MatchingRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly policyConfig: PolicyConfigService,
    private readonly consents: ConsentRuntimeService
  ) {}

  async getCurrentConnection(user: AuthenticatedUserContext): Promise<ConnectionSummary | null> {
    const record = await this.profiles.getCurrentProfileRecord(user);
    await this.ensureCurrentMatch(record.user.id);

    const activeSession = await this.prisma.clientInstance.matchSession.findFirst({
      where: {
        status: "active",
        OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
      },
      orderBy: { createdAt: "desc" }
    });

    if (activeSession) {
      return this.buildActiveConnectionSummary(record.user.id, record.profile, activeSession);
    }

    const peerDeletedSession = await this.prisma.clientInstance.matchSession.findFirst({
      where: {
        status: "closed_peer_deleted",
        OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
      },
      orderBy: { expiresAt: "desc" }
    });

    if (peerDeletedSession) {
      return this.buildPeerDeletedSummary();
    }

    return null;
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
      await this.ensureCurrentMatch(user.id);
    }
  }

  private async buildActiveConnectionSummary(
    userId: string,
    profile: {
      stateKey: string;
      trustKeys: string[];
    },
    session: {
      id: string;
      userAId: string;
      userBId: string;
      origin: string;
      score: number | null;
    }
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
      displayName: peer.displayName,
      matchScore: session.score ?? 0,
      trustLevel: Math.max(1, Math.min(5, sharedKeys.length + 1)),
      sharedKeys,
      sharedState:
        profile.stateKey === peer.stateKey ? "Общее состояние по матрице" : "Разные, но совместимые состояния",
      statusCopy:
        session.origin === "beacon"
          ? "Связь найдена через Beacon fallback по тем же параметрам матрицы."
          : "Связь найдена автоматическим matching pipeline.",
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

  private async ensureCurrentMatch(userId: string): Promise<void> {
    const existing = await this.prisma.clientInstance.matchSession.findFirst({
      where: {
        status: "active",
        OR: [{ userAId: userId }, { userBId: userId }]
      }
    });

    if (existing) {
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

    const [scoring, stateMatrix, intentMatrix] = await Promise.all([
      this.policyConfig.getMatchingScoring(),
      this.policyConfig.getMatchingStateMatrix(),
      this.policyConfig.getMatchingIntentMatrix()
    ]);
    const activeSessions = await this.prisma.clientInstance.matchSession.findMany({
      where: { status: "active" }
    });
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

    for (const session of activeSessions) {
      activeCountByUser.set(session.userAId, (activeCountByUser.get(session.userAId) ?? 0) + 1);
      activeCountByUser.set(session.userBId, (activeCountByUser.get(session.userBId) ?? 0) + 1);
    }

    const selfCandidate = this.toCandidate(self, activeCountByUser.get(self.userId) ?? 0);
    let bestMatch:
      | {
          candidateUserId: string;
          score: number;
          origin: "automatic" | "beacon";
        }
      | undefined;

    for (const candidateProfile of allProfiles) {
      const candidate = this.toCandidate(
        candidateProfile,
        activeCountByUser.get(candidateProfile.userId) ?? 0
      );
      const hasActivePairMatch = activeSessions.some(
        (session) =>
          (session.userAId === self.userId && session.userBId === candidateProfile.userId) ||
          (session.userAId === candidateProfile.userId && session.userBId === self.userId)
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
          hasPairExclusion: false,
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
            origin: bestMatch.origin,
            status: "active",
            score: bestMatch.score
          }
        });
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
  }

  private toCandidate(
    profile: {
      userId: string;
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

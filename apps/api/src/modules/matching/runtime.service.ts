import { Injectable } from "@nestjs/common";
import { evaluateMatchingCandidate, type ConnectionSummary } from "@corens/domain";
import type { MatchingCandidate } from "@corens/domain";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import { ConsentRuntimeService } from "../consents/runtime.service";
import { ProfilesService } from "../profiles";

@Injectable()
export class MatchingRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly policyConfig: PolicyConfigService,
    private readonly consents: ConsentRuntimeService
  ) {}

  async getCurrentConnection(): Promise<ConnectionSummary | null> {
    const record = await this.profiles.getCurrentProfileRecord();
    await this.ensureCurrentMatch(record.user.id);

    const session = await this.prisma.clientInstance.matchSession.findFirst({
      where: {
        status: "active",
        OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
      },
      orderBy: { createdAt: "desc" }
    });

    if (!session) {
      return null;
    }

    const peerUserId = session.userAId === record.user.id ? session.userBId : session.userAId;
    const peer = await this.prisma.clientInstance.profile.findUnique({
      where: { userId: peerUserId },
      include: { user: true }
    });

    if (!peer) {
      return null;
    }

    const sharedKeys = record.profile.trustKeys.filter((item) => peer.trustKeys.includes(item));
    const consentStatus = await this.consents.buildStatusForMatch(
      session.id,
      record.user.id,
      peer.userId,
      {
        telegramUsername: peer.user.telegramUsername,
        telegramUserId: peer.user.telegramUserId
      }
    );

    return {
      displayName: peer.displayName,
      matchScore: session.score ?? 0,
      trustLevel: Math.max(1, Math.min(5, sharedKeys.length + 1)),
      sharedKeys,
      sharedState:
        record.profile.stateKey === peer.stateKey ? "Общий ритм состояния" : "Разный, но совместимый ритм",
      statusCopy:
        session.origin === "beacon"
          ? "Связь найдена через Beacon fallback по тем же параметрам матрицы."
          : "Связь найдена автоматическим matching pipeline.",
      contactConsent: consentStatus.contact,
      photoConsent: consentStatus.photo
    };
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
        userId: { not: userId }
      },
      include: { user: true }
    });

    if (allProfiles.length === 0) {
      return;
    }

    const scoring = await this.policyConfig.getMatchingScoring();
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
          moodScore: self.stateKey === candidateProfile.stateKey ? 1 : 0,
          intentScore: self.intentKey === candidateProfile.intentKey ? 1 : 0,
          moodUpdatedRecently: false,
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
          score: evaluation.score,
          origin
        };
      }
    }

    if (!bestMatch) {
      return;
    }

    const [userAId, userBId] = [self.userId, bestMatch.candidateUserId].sort();

    await this.prisma.clientInstance.matchSession.create({
      data: {
        userAId,
        userBId,
        origin: bestMatch.origin,
        status: "active",
        score: bestMatch.score
      }
    });
  }

  private toCandidate(
    profile: {
      userId: string;
      stateKey: string;
      intentKey: string;
      trustKeys: string[];
      matchingEnabled: boolean;
      visibilityStatus: string;
    },
    activeConnectionsCount: number
  ): MatchingCandidate {
    return {
      userId: profile.userId,
      stateKey: profile.stateKey,
      intentKey: profile.intentKey,
      trustKeys: profile.trustKeys.map((item) => item.toLowerCase()),
      activeConnectionsCount,
      matchingEnabled: profile.matchingEnabled,
      isHidden: profile.visibilityStatus === "hidden"
    };
  }
}

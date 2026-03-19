import { BadRequestException, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@corens/db";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import type { AuthenticatedUserContext } from "../auth/service";

const AGGREGATE_DELETION_ANALYTICS_USER_ID = "__aggregate__";
const PEER_DELETED_PREFIX = "deleted:";

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

@Injectable()
export class PrivacyRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyConfig: PolicyConfigService
  ) {}

  async requestDeletion(user: AuthenticatedUserContext, confirmation: string): Promise<void> {
    if (confirmation.trim().toLowerCase() !== "удалить") {
      throw new BadRequestException("Deletion confirmation is invalid");
    }

    await this.hardDeleteByUserId(user.id);
  }

  async devReset(user: AuthenticatedUserContext): Promise<void> {
    await this.hardDeleteByUserId(user.id);
  }

  async hardDeleteByUserId(
    userId: string,
    options?: {
      trackAggregateAnalytics?: boolean;
    }
  ): Promise<void> {
    const record = await this.prisma.clientInstance.user.findUnique({
      where: { id: userId }
    });

    if (!record) {
      return;
    }

    const now = new Date();
    const trackAggregateAnalytics = options?.trackAggregateAnalytics ?? true;

    await this.policyConfig.getPrivacyRules();

    await this.prisma.clientInstance.$transaction(async (tx) => {
      const matchIds = await this.matchIdsForUser(tx, userId);

      await this.closeMatchesForDeletedUser(tx, userId, now, matchIds);

      await tx.contactConsent.deleteMany({
        where: {
          OR: [{ matchSessionId: { in: matchIds } }, { requestedBy: userId }]
        }
      });

      await tx.photoRevealConsent.deleteMany({
        where: {
          OR: [{ matchSessionId: { in: matchIds } }, { requestedBy: userId }]
        }
      });

      await tx.moderationEvent.deleteMany({
        where: {
          OR: [
            { actorUserId: userId },
            { targetUserId: userId },
            { matchSessionId: { in: matchIds } }
          ]
        }
      });

      await tx.beaconSession.deleteMany({
        where: { userId }
      });

      await tx.deletionEvent.deleteMany({
        where: { userId }
      });

      await tx.session.deleteMany({
        where: { userId }
      });

      await tx.profile.deleteMany({
        where: { userId }
      });

      await tx.user.delete({
        where: { id: userId }
      });

      if (trackAggregateAnalytics) {
        await tx.deletionEvent.create({
          data: {
            userId: AGGREGATE_DELETION_ANALYTICS_USER_ID,
            stage: "hard_delete_completed",
            completedAt: now
          }
        });
      }
    });
  }

  async cleanupRetention(): Promise<void> {
    const retention = await this.policyConfig.getRetentionPolicies();
    const now = new Date();
    const matchCutoff = new Date(now.getTime() - retention.retention.match_sessions_days * 86_400_000);
    const beaconCutoff = new Date(now.getTime() - retention.retention.beacon_sessions_days * 86_400_000);
    const consentCutoff = new Date(now.getTime() - retention.retention.reveal_consents_days * 86_400_000);

    await this.prisma.clientInstance.matchSession.deleteMany({
      where: {
        createdAt: { lt: matchCutoff },
        status: { not: "active" }
      }
    });

    await this.prisma.clientInstance.beaconSession.deleteMany({
      where: {
        activatedAt: { lt: beaconCutoff },
        status: { not: "active" }
      }
    });

    await this.prisma.clientInstance.contactConsent.deleteMany({
      where: {
        resolvedAt: { lt: consentCutoff }
      }
    });

    await this.prisma.clientInstance.photoRevealConsent.deleteMany({
      where: {
        resolvedAt: { lt: consentCutoff }
      }
    });

    await this.prisma.clientInstance.moderationEvent.deleteMany({
      where: {
        createdAt: { lt: consentCutoff }
      }
    });
  }

  private async closeMatchesForDeletedUser(
    tx: TransactionClient,
    userId: string,
    now: Date,
    matchIds: string[]
  ): Promise<void> {
    const matches = await tx.matchSession.findMany({
      where: {
        id: { in: matchIds }
      }
    });

    for (const match of matches) {
      const peerUserId = match.userAId === userId ? match.userBId : match.userAId;
      const peerUser = await tx.user.findUnique({
        where: { id: peerUserId }
      });

      if (peerUser?.status === "active") {
        await tx.matchSession.update({
          where: { id: match.id },
          data: {
            pairKey: `peer-deleted:${match.id}`,
            userAId: peerUser.id,
            userBId: `${PEER_DELETED_PREFIX}${match.id}`,
            status: "closed_peer_deleted",
            score: null,
            expiresAt: now
          }
        });
        continue;
      }

      await tx.matchSession.delete({
        where: { id: match.id }
      });
    }
  }

  private async matchIdsForUser(tx: TransactionClient, userId: string): Promise<string[]> {
    const matches = await tx.matchSession.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }]
      },
      select: { id: true }
    });

    return matches.map((item) => item.id);
  }
}

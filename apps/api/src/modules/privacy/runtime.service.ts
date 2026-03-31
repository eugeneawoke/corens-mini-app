import { BadRequestException, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@corens/db";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import { BotNotificationService } from "../../telegram/bot-notification.service";
import type { AuthenticatedUserContext } from "../auth/service";
import { MediaService } from "../media/service";

const AGGREGATE_DELETION_ANALYTICS_USER_ID = "__aggregate__";
const PEER_DELETED_PREFIX = "deleted:";

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

@Injectable()
export class PrivacyRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyConfig: PolicyConfigService,
    private readonly media: MediaService,
    private readonly notifications: BotNotificationService
  ) {}

  async requestDeletion(user: AuthenticatedUserContext, confirmation: string): Promise<void> {
    if (confirmation.trim().toLowerCase() !== "удалить") {
      throw new BadRequestException("Deletion confirmation is invalid");
    }

    await this.hardDeleteByUserId(user.id);
  }

  async devReset(user: AuthenticatedUserContext): Promise<void> {
    await this.resetUserById(user.id);
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
    const userPhoto = await this.prisma.clientInstance.userPhoto.findUnique({
      where: { userId }
    });

    if (!record) {
      return;
    }

    const now = new Date();
    const trackAggregateAnalytics = options?.trackAggregateAnalytics ?? true;
    const peerNotifications: Array<{ telegramUserId: string }> = [];

    await this.policyConfig.getPrivacyRules();

    if (userPhoto) {
      try {
        await this.media.deleteStoredPhotoBytes(userPhoto);
      } catch (error) {
        await this.prisma.clientInstance.deletionEvent.create({
          data: {
            userId,
            stage: "assets_delete_failed"
          }
        });
        throw error;
      }
    }

    await this.prisma.clientInstance.$transaction(async (tx) => {
      const matchIds = await this.matchIdsForUser(tx, userId);

      peerNotifications.push(...(await this.closeMatchesForDeletedUser(tx, userId, now, matchIds)));

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

      await tx.session.deleteMany({
        where: { userId }
      });

      await tx.userPhoto.deleteMany({
        where: { userId }
      });

      await tx.profile.deleteMany({
        where: { userId }
      });

      await tx.user.delete({
        where: { id: userId }
      });

      await tx.deletionEvent.create({
        data: {
          userId,
          stage: "hard_delete_completed",
          completedAt: now
        }
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

    for (const peer of peerNotifications) {
      void this.notifications.notifyConnectionClosed(peer.telegramUserId);
    }
  }

  async resetUserById(userId: string): Promise<void> {
    const record = await this.prisma.clientInstance.user.findUnique({
      where: { id: userId }
    });
    const profile = await this.prisma.clientInstance.profile.findUnique({
      where: { userId }
    });
    const userPhoto = await this.prisma.clientInstance.userPhoto.findUnique({
      where: { userId }
    });

    if (!record) {
      return;
    }

    const now = new Date();
    const peerNotifications: Array<{ telegramUserId: string; peerName?: string }> = [];

    if (userPhoto) {
      try {
        await this.media.deleteStoredPhotoBytes(userPhoto);
      } catch (error) {
        await this.prisma.clientInstance.deletionEvent.create({
          data: {
            userId,
            stage: "reset_assets_delete_failed"
          }
        });
        throw error;
      }
    }

    await this.prisma.clientInstance.$transaction(async (tx) => {
      const matchIds = await this.matchIdsForUser(tx, userId);

      peerNotifications.push(...(await this.closeMatchesForReset(tx, userId, now, matchIds)));

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

      await tx.session.deleteMany({
        where: { userId }
      });

      await tx.userPhoto.deleteMany({
        where: { userId }
      });

      await tx.profile.update({
        where: { userId },
        data: {
          displayName: profile?.displayName?.trim() || record.telegramUsername || "Новый профиль",
          gender: "",
          partnerGender: "opposite",
          about: null,
          stateKey: "calm",
          intentKey: "",
          trustKeys: [],
          trustKeysUpdatedAt: null,
          photoCount: 0,
          visibilityStatus: "active",
          matchingEnabled: true,
          onboardingCompleted: false,
          onboardingStartedAt: null
        }
      });
    });

    for (const peer of peerNotifications) {
      void this.notifications.notifyConnectionClosed(peer.telegramUserId, peer.peerName);
    }
  }

  async resetUserData(user: AuthenticatedUserContext): Promise<void> {
    await this.resetUserById(user.id);
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
  ): Promise<Array<{ telegramUserId: string }>> {
    const matches = await tx.matchSession.findMany({
      where: {
        id: { in: matchIds }
      }
    });
    const peerNotifications: Array<{ telegramUserId: string }> = [];

    for (const match of matches) {
      const peerUserId = match.userAId === userId ? match.userBId : match.userAId;
      const peerUser = await tx.user.findUnique({
        where: { id: peerUserId }
      });

      if (peerUser?.status === "active") {
        peerNotifications.push({ telegramUserId: peerUser.telegramUserId });
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

    return peerNotifications;
  }

  private async closeMatchesForReset(
    tx: TransactionClient,
    userId: string,
    now: Date,
    matchIds: string[]
  ): Promise<Array<{ telegramUserId: string; peerName?: string }>> {
    const matches = await tx.matchSession.findMany({
      where: {
        id: { in: matchIds }
      }
    });
    const peerNotifications: Array<{ telegramUserId: string; peerName?: string }> = [];

    for (const match of matches) {
      const peerUserId = match.userAId === userId ? match.userBId : match.userAId;
      const peerUser = await tx.user.findUnique({
        where: { id: peerUserId }
      });

      if (peerUser?.status === "active") {
        peerNotifications.push({
          telegramUserId: peerUser.telegramUserId
        });
      }

      await tx.matchSession.update({
        where: { id: match.id },
        data: {
          status: "closed_manual",
          expiresAt: now
        }
      });
    }

    return peerNotifications;
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

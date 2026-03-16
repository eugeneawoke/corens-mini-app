import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import { ProfilesService } from "../profiles";

@Injectable()
export class PrivacyRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly policyConfig: PolicyConfigService
  ) {}

  async requestDeletion(confirmation: string): Promise<void> {
    if (confirmation.trim().toLowerCase() !== "удалить") {
      throw new BadRequestException("Deletion confirmation is invalid");
    }

    const record = await this.profiles.getCurrentProfileRecord();
    const rules = await this.policyConfig.getPrivacyRules();
    const now = new Date();

    await this.prisma.clientInstance.user.update({
      where: { id: record.user.id },
      data: {
        status: "pending_deletion"
      }
    });

    await this.prisma.clientInstance.profile.update({
      where: { userId: record.user.id },
      data: {
        displayName: "Удаленный профиль",
        about: null,
        trustKeys: [],
        visibilityStatus: "hidden",
        matchingEnabled: false,
        onboardingCompleted: false
      }
    });

    if (rules.deletion.revokeSessionsImmediately) {
      await this.prisma.clientInstance.matchSession.updateMany({
        where: {
          status: "active",
          OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
        },
        data: {
          status: "closed_due_to_deletion",
          expiresAt: now
        }
      });
    }

    if (rules.deletion.expireBeaconImmediately) {
      await this.prisma.clientInstance.beaconSession.updateMany({
        where: {
          userId: record.user.id,
          status: "active"
        },
        data: {
          status: "expired",
          expiresAt: now
        }
      });
    }

    if (rules.deletion.closeOpenConsentsImmediately) {
      await this.prisma.clientInstance.contactConsent.updateMany({
        where: {
          matchSessionId: {
            in: await this.activeMatchIds(record.user.id)
          },
          requestStatus: "pending"
        },
        data: {
          requestStatus: "declined",
          resolvedAt: now
        }
      });

      await this.prisma.clientInstance.photoRevealConsent.updateMany({
        where: {
          matchSessionId: {
            in: await this.activeMatchIds(record.user.id)
          },
          requestStatus: "pending"
        },
        data: {
          requestStatus: "declined",
          resolvedAt: now
        }
      });
    }

    const stages = [
      "pending",
      "sessions_revoked",
      "consents_closed",
      "assets_deleted",
      "purged",
      "completed"
    ];

    for (const stage of stages) {
      await this.prisma.clientInstance.deletionEvent.create({
        data: {
          userId: record.user.id,
          stage,
          completedAt: now
        }
      });
    }
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

  private async activeMatchIds(userId: string): Promise<string[]> {
    const matches = await this.prisma.clientInstance.matchSession.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }]
      },
      select: { id: true }
    });

    return matches.map((item) => item.id);
  }
}

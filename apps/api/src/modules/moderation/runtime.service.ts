import { HttpException, Injectable, HttpStatus, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import type { AuthenticatedUserContext } from "../auth/service";
import { ProfilesService } from "../profiles";
import { BotNotificationService } from "../../telegram/bot-notification.service";

@Injectable()
export class ModerationRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly policyConfig: PolicyConfigService,
    private readonly notifications: BotNotificationService
  ) {}

  async report(user: AuthenticatedUserContext, connectionId: string, note?: string): Promise<void> {
    await this.capture(user, "report", connectionId, note);
  }

  async block(user: AuthenticatedUserContext, connectionId: string, note?: string): Promise<void> {
    await this.capture(user, "block", connectionId, note);
  }

  private async capture(
    user: AuthenticatedUserContext,
    eventType: "report" | "block",
    connectionId: string,
    note?: string
  ): Promise<void> {
    const record = await this.profiles.getCurrentProfileRecord(user);
    const match = await this.prisma.clientInstance.matchSession.findFirst({
      where: {
        id: connectionId,
        status: "active",
        OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
      }
    });

    if (!match) {
      throw new NotFoundException("Connection not found");
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const reportsToday = await this.prisma.clientInstance.moderationEvent.count({
      where: {
        actorUserId: record.user.id,
        eventType: "report",
        createdAt: { gte: todayStart }
      }
    });
    const moderationRules = await this.policyConfig.getModerationRules();

    if (
      eventType === "report" &&
      moderationRules.reportRequestsPerDay > 0 &&
      reportsToday >= moderationRules.reportRequestsPerDay
    ) {
      throw new HttpException("Report limit reached", HttpStatus.TOO_MANY_REQUESTS);
    }

    const targetUserId = match.userAId === record.user.id ? match.userBId : match.userAId;

    await this.prisma.clientInstance.$transaction(async (tx) => {
      const now = new Date();

      await tx.moderationEvent.create({
        data: {
          matchSessionId: match.id,
          actorUserId: record.user.id,
          targetUserId,
          eventType,
          note: note?.trim() || null
        }
      });

      await tx.matchSession.update({
        where: { id: match.id },
        data: {
          status: eventType === "block" ? "closed_blocked" : "closed_reported",
          expiresAt: now
        }
      });

      await tx.contactConsent.updateMany({
        where: {
          matchSessionId: match.id,
          requestStatus: "pending"
        },
        data: {
          requestStatus: "declined",
          resolvedAt: now
        }
      });

      await tx.photoRevealConsent.updateMany({
        where: {
          matchSessionId: match.id,
          requestStatus: "pending"
        },
        data: {
          requestStatus: "declined",
          resolvedAt: now
        }
      });
    });

    if (eventType === "block") {
      const actorProfile = await this.prisma.clientInstance.profile.findUnique({
        where: { userId: record.user.id },
        select: { displayName: true }
      });
      const targetUser = await this.prisma.clientInstance.user.findUnique({
        where: { id: targetUserId },
        select: { telegramUserId: true }
      });
      if (targetUser) {
        void this.notifications.notifyConnectionClosed(
          targetUser.telegramUserId,
          actorProfile?.displayName ?? undefined
        );
      }
    }
  }
}

import { HttpException, Injectable, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import type { AuthenticatedUserContext } from "../auth/service";
import { ProfilesService } from "../profiles";

@Injectable()
export class ModerationRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly policyConfig: PolicyConfigService
  ) {}

  async report(user: AuthenticatedUserContext, note?: string): Promise<void> {
    await this.capture(user, "report", note);
  }

  async block(user: AuthenticatedUserContext, note?: string): Promise<void> {
    await this.capture(user, "block", note);
  }

  private async capture(
    user: AuthenticatedUserContext,
    eventType: "report" | "block",
    note?: string
  ): Promise<void> {
    const record = await this.profiles.getCurrentProfileRecord(user);
    const match = await this.prisma.clientInstance.matchSession.findFirst({
      where: {
        status: "active",
        OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
      },
      orderBy: { createdAt: "desc" }
    });

    if (!match) {
      return;
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
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { resolveConsentRequest, type ConsentChannel, type ConsentDecision, type ConsentStatusView } from "@corens/domain";
import { createTelegramDeepLink } from "@corens/telegram";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import type { AuthenticatedUserContext } from "../auth/service";
import { ProfilesService } from "../profiles";

@Injectable()
export class ConsentRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly policyConfig: PolicyConfigService
  ) {}

  async getStatus(
    user: AuthenticatedUserContext,
    channel: ConsentChannel
  ): Promise<ConsentStatusView> {
    const match = await this.getCurrentMatch(user);

    if (match.status === "closed_peer_deleted") {
      return this.buildPeerDeletedStatus(channel);
    }

    return this.resolveStatus(match.id, match.selfUserId, match.peerUserId, channel);
  }

  async updateStatus(
    user: AuthenticatedUserContext,
    channel: ConsentChannel,
    decision: ConsentDecision
  ): Promise<ConsentStatusView> {
    const match = await this.getCurrentMatch(user);

    if (match.status === "closed_peer_deleted") {
      return this.buildPeerDeletedStatus(channel);
    }

    const recordId = `${match.id}:${match.selfUserId}:${channel}`;

    if (channel === "contact") {
      await this.prisma.clientInstance.contactConsent.upsert({
        where: { id: recordId },
        update: {
          requestStatus: decision,
          resolvedAt: decision === "pending" ? null : new Date()
        },
        create: {
          id: recordId,
          matchSessionId: match.id,
          requestedBy: match.selfUserId,
          requestStatus: decision,
          resolvedAt: decision === "pending" ? null : new Date()
        }
      });
    } else {
      await this.prisma.clientInstance.photoRevealConsent.upsert({
        where: { id: recordId },
        update: {
          requestStatus: decision,
          resolvedAt: decision === "pending" ? null : new Date()
        },
        create: {
          id: recordId,
          matchSessionId: match.id,
          requestedBy: match.selfUserId,
          requestStatus: decision,
          resolvedAt: decision === "pending" ? null : new Date()
        }
      });
    }

    return this.resolveStatus(match.id, match.selfUserId, match.peerUserId, channel);
  }

  async buildStatusForMatch(
    matchSessionId: string,
    selfUserId: string,
    peerUserId: string,
    peerTelegram: { telegramUsername: string | null; telegramUserId: string }
  ): Promise<{
    contact: ConsentStatusView;
    photo: ConsentStatusView;
  }> {
    return {
      contact: await this.resolveStatus(
        matchSessionId,
        selfUserId,
        peerUserId,
        "contact",
        peerTelegram
      ),
      photo: await this.resolveStatus(matchSessionId, selfUserId, peerUserId, "photo", peerTelegram)
    };
  }

  private async resolveStatus(
    matchSessionId: string,
    selfUserId: string,
    peerUserId: string,
    channel: ConsentChannel,
    peerTelegram?: { telegramUsername: string | null; telegramUserId: string }
  ): Promise<ConsentStatusView> {
    const decisions =
      channel === "contact"
        ? await this.prisma.clientInstance.contactConsent.findMany({
            where: {
              matchSessionId,
              requestedBy: {
                in: [selfUserId, peerUserId]
              }
            }
          })
        : await this.prisma.clientInstance.photoRevealConsent.findMany({
            where: {
              matchSessionId,
              requestedBy: {
                in: [selfUserId, peerUserId]
              }
            }
          });
    const selfDecision =
      decisions.find((item: { requestedBy: string; requestStatus: string }) => item.requestedBy === selfUserId)?.requestStatus ?? "pending";
    const peerDecision =
      decisions.find((item: { requestedBy: string; requestStatus: string }) => item.requestedBy === peerUserId)?.requestStatus ?? "pending";
    const revealRules = await this.policyConfig.getRevealRules();
    const resolution = resolveConsentRequest(
      {
        matchSessionId,
        requestedByUserId: selfUserId,
        channel,
        decisionByActor: selfDecision as ConsentDecision,
        decisionByPeer: peerDecision as ConsentDecision
      },
      revealRules.channels
    );

    return {
      channel,
      status: resolution.status,
      warnings: resolution.warnings,
      artifactType: resolution.artifact?.artifactType,
      artifactValue:
        channel === "contact" && resolution.status === "approved" && peerTelegram
          ? this.buildTelegramDeepLink(peerTelegram)
          : undefined
    };
  }

  private async getCurrentMatch(user: AuthenticatedUserContext): Promise<{
    id: string;
    selfUserId: string;
    peerUserId: string;
    peerTelegram?: { telegramUsername: string | null; telegramUserId: string };
    status: string;
  }> {
    const record = await this.profiles.getCurrentProfileRecord(user);
    const match = await this.prisma.clientInstance.matchSession.findFirst({
      where: {
        status: { in: ["active", "closed_peer_deleted"] },
        OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });

    if (!match) {
      throw new NotFoundException("Consent status is unavailable");
    }

    const peerUserId = match.userAId === record.user.id ? match.userBId : match.userAId;

    if (match.status === "closed_peer_deleted") {
      return {
        id: match.id,
        selfUserId: record.user.id,
        peerUserId,
        status: match.status
      };
    }

    const peerUser = await this.prisma.clientInstance.user.findUnique({
      where: { id: peerUserId }
    });

    if (!peerUser) {
      throw new NotFoundException("Consent status is unavailable");
    }

    return {
      id: match.id,
      selfUserId: record.user.id,
      peerUserId,
      status: match.status,
      peerTelegram: {
        telegramUsername: peerUser.telegramUsername,
        telegramUserId: peerUser.telegramUserId
      }
    };
  }

  private buildPeerDeletedStatus(channel: ConsentChannel): ConsentStatusView {
    return {
      channel,
      status: "declined",
      warnings: ["peer_deleted"]
    };
  }

  private buildTelegramDeepLink(peer: {
    telegramUsername: string | null;
    telegramUserId: string;
  }): string {
    if (peer.telegramUsername) {
      return createTelegramDeepLink(peer.telegramUsername);
    }

    return `tg://user?id=${peer.telegramUserId}`;
  }
}

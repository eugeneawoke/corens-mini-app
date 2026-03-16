import { Injectable, NotFoundException } from "@nestjs/common";
import { resolveConsentRequest, type ConsentChannel, type ConsentDecision, type ConsentStatusView } from "@corens/domain";
import { PrismaService } from "../../prisma.service";
import { ProfilesService } from "../profiles";

@Injectable()
export class ConsentRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService
  ) {}

  async getStatus(channel: ConsentChannel): Promise<ConsentStatusView> {
    const match = await this.getCurrentMatch();
    return this.resolveStatus(match.id, match.selfUserId, match.peerUserId, channel);
  }

  async updateStatus(
    channel: ConsentChannel,
    decision: ConsentDecision
  ): Promise<ConsentStatusView> {
    const match = await this.getCurrentMatch();
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
    const resolution = resolveConsentRequest(
      {
        matchSessionId,
        requestedByUserId: selfUserId,
        channel,
        decisionByActor: selfDecision as ConsentDecision,
        decisionByPeer: peerDecision as ConsentDecision
      },
      {
        contact: {
          requiresMutualConsent: true,
          softWarningRequired: true,
          exposedArtifact: "telegram_deep_link"
        },
        photo: {
          requiresMutualConsent: true,
          exposedArtifact: "photo_asset"
        }
      }
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

  private async getCurrentMatch(): Promise<{
    id: string;
    selfUserId: string;
    peerUserId: string;
    peerTelegram: { telegramUsername: string | null; telegramUserId: string };
  }> {
    const record = await this.profiles.getCurrentProfileRecord();
    const match = await this.prisma.clientInstance.matchSession.findFirst({
      where: {
        status: "active",
        OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
      },
      orderBy: { createdAt: "desc" }
    });

    if (!match) {
      throw new NotFoundException("Consent status is unavailable");
    }

    const peerUserId = match.userAId === record.user.id ? match.userBId : match.userAId;
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
      peerTelegram: {
        telegramUsername: peerUser.telegramUsername,
        telegramUserId: peerUser.telegramUserId
      }
    };
  }

  private buildTelegramDeepLink(peer: {
    telegramUsername: string | null;
    telegramUserId: string;
  }): string {
    if (peer.telegramUsername) {
      return `https://t.me/${peer.telegramUsername}`;
    }

    return `tg://user?id=${peer.telegramUserId}`;
  }
}

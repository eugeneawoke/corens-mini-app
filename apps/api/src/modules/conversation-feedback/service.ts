import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  deriveConversationPairStatus,
  type ConversationFeedbackResponse,
  type ConversationObstacle,
  type ConversationOutcome,
  type ConversationPairStatus,
  type ConversationValue,
  type NextConversationIntent
} from "@corens/domain";
import type { ConversationFeedback } from "@corens/db";
import { PolicyConfigService } from "../../policy-config.service";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class ConversationFeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyConfig: PolicyConfigService
  ) {}

  async ensureForMutualApproval(matchSessionId: string, now = new Date()): Promise<void> {
    const match = await this.getMatch(matchSessionId);
    const participantUserIds = [match.userAId, match.userBId];
    const approvals = await this.prisma.clientInstance.contactConsent.findMany({
      where: {
        matchSessionId,
        requestedBy: { in: participantUserIds },
        requestStatus: "approved"
      }
    });
    const approvedParticipantIds = new Set(approvals.map((approval) => approval.requestedBy));

    if (
      participantUserIds.some((participantUserId) =>
        !approvedParticipantIds.has(participantUserId)
      )
    ) {
      throw new BadRequestException("Mutual contact approval required");
    }

    const rules = await this.policyConfig.getConversationFeedbackRules();
    const promptDueAt = new Date(
      now.getTime() + rules.timing.withoutContactOpenHours * 60 * 60 * 1000
    );

    await this.prisma.clientInstance.$transaction(async (transaction) => {
      await Promise.all(
        participantUserIds.map((participantUserId) =>
          transaction.conversationFeedback.upsert({
            where: {
              matchSessionId_participantUserId: {
                matchSessionId,
                participantUserId
              }
            },
            update: {},
            create: {
              id: `${matchSessionId}:${participantUserId}`,
              matchSessionId,
              participantUserId,
              callbackToken: randomBytes(24).toString("base64url"),
              contactOpenedAt: null,
              promptDueAt,
              promptedAt: null,
              promptAttempts: 0,
              outcome: null,
              value: null,
              obstacle: null,
              nextIntent: null,
              completedAt: null,
              createdAt: now,
              updatedAt: now
            }
          })
        )
      );
    });
  }

  async recordOutcome(
    matchSessionId: string,
    participantUserId: string,
    outcome: ConversationOutcome
  ): Promise<ConversationFeedbackResponse> {
    await this.getFeedback(matchSessionId, participantUserId);
    const updated = await this.prisma.clientInstance.conversationFeedback.update({
      where: {
        matchSessionId_participantUserId: { matchSessionId, participantUserId }
      },
      data: {
        outcome,
        value: null,
        obstacle: null,
        nextIntent: null,
        completedAt: null
      }
    });
    return this.toResponse(updated);
  }

  async recordValue(
    matchSessionId: string,
    participantUserId: string,
    value: ConversationValue
  ): Promise<ConversationFeedbackResponse> {
    const feedback = await this.getFeedback(matchSessionId, participantUserId);

    if (feedback.outcome !== "talked") {
      throw new BadRequestException("Value is only valid when a conversation was reported");
    }

    const updated = await this.prisma.clientInstance.conversationFeedback.update({
      where: {
        matchSessionId_participantUserId: { matchSessionId, participantUserId }
      },
      data: { value, obstacle: null }
    });
    return this.toResponse(updated);
  }

  async recordObstacle(
    matchSessionId: string,
    participantUserId: string,
    obstacle: ConversationObstacle
  ): Promise<ConversationFeedbackResponse> {
    const feedback = await this.getFeedback(matchSessionId, participantUserId);

    if (!feedback.outcome || feedback.outcome === "talked") {
      throw new BadRequestException(
        "Obstacle is only valid when no conversation was reported"
      );
    }

    const updated = await this.prisma.clientInstance.conversationFeedback.update({
      where: {
        matchSessionId_participantUserId: { matchSessionId, participantUserId }
      },
      data: { obstacle, value: null }
    });
    return this.toResponse(updated);
  }

  async recordNextIntent(
    matchSessionId: string,
    participantUserId: string,
    nextIntent: NextConversationIntent,
    now = new Date()
  ): Promise<ConversationFeedbackResponse> {
    const feedback = await this.getFeedback(matchSessionId, participantUserId);
    const questionTwoCompleted =
      feedback.outcome === "talked" ? feedback.value !== null : feedback.obstacle !== null;

    if (!feedback.outcome || !questionTwoCompleted) {
      throw new BadRequestException("Question two must be completed first");
    }

    const updated = await this.prisma.clientInstance.conversationFeedback.update({
      where: {
        matchSessionId_participantUserId: { matchSessionId, participantUserId }
      },
      data: {
        nextIntent,
        completedAt: feedback.completedAt ?? now
      }
    });
    return this.toResponse(updated);
  }

  async getPairStatus(matchSessionId: string): Promise<ConversationPairStatus> {
    const match = await this.getMatch(matchSessionId);
    const participantUserIds = new Set([match.userAId, match.userBId]);
    const feedback = await this.prisma.clientInstance.conversationFeedback.findMany({
      where: { matchSessionId }
    });

    return deriveConversationPairStatus(
      matchSessionId,
      feedback
        .filter((item) => participantUserIds.has(item.participantUserId))
        .map((item) => ({
          matchSessionId: item.matchSessionId,
          participantUserId: item.participantUserId,
          outcome: item.outcome as ConversationOutcome | null
        }))
    );
  }

  private async getMatch(matchSessionId: string) {
    const match = await this.prisma.clientInstance.matchSession.findUnique({
      where: { id: matchSessionId }
    });

    if (!match) {
      throw new NotFoundException("Match session not found");
    }

    return match;
  }

  private async getFeedback(
    matchSessionId: string,
    participantUserId: string
  ): Promise<ConversationFeedback> {
    const feedback = await this.prisma.clientInstance.conversationFeedback.findUnique({
      where: {
        matchSessionId_participantUserId: { matchSessionId, participantUserId }
      }
    });

    if (!feedback) {
      throw new NotFoundException("Feedback not found");
    }

    return feedback;
  }

  private toResponse(feedback: ConversationFeedback): ConversationFeedbackResponse {
    return {
      matchSessionId: feedback.matchSessionId,
      outcome: feedback.outcome as ConversationOutcome | null,
      value: feedback.value as ConversationValue | null,
      obstacle: feedback.obstacle as ConversationObstacle | null,
      nextIntent: feedback.nextIntent as NextConversationIntent | null,
      promptDueAt: feedback.promptDueAt.toISOString(),
      completedAt: feedback.completedAt?.toISOString() ?? null
    };
  }
}

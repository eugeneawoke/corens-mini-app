import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CONVERSATION_OBSTACLES,
  CONVERSATION_OUTCOMES,
  CONVERSATION_VALUES,
  NEXT_CONVERSATION_INTENTS,
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

export type ConversationFeedbackBotStep =
  | "outcome"
  | "value"
  | "obstacle"
  | "next_intent";

export type ConversationFeedbackBotAnswer =
  | { step: "outcome"; value: ConversationOutcome }
  | { step: "value"; value: ConversationValue }
  | { step: "obstacle"; value: ConversationObstacle }
  | { step: "next_intent"; value: NextConversationIntent };

export type ConversationFeedbackBotNextStep =
  | ConversationFeedbackBotStep
  | "completed";

export interface ConversationFeedbackBotSubmitResult {
  accepted: boolean;
  nextStep: ConversationFeedbackBotNextStep | null;
}

export interface DueConversationFeedbackPrompt {
  id: string;
  telegramUserId: string;
  callbackToken: string;
  promptClaimedAt: Date | null;
  promptAttempts: number;
}

function isAllowedValue<T extends readonly string[]>(
  values: T,
  candidate: string
): candidate is T[number] {
  return values.includes(candidate as T[number]);
}

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

  async recordContactOpened(
    matchSessionId: string,
    participantUserId: string,
    now = new Date()
  ): Promise<{ recorded: boolean }> {
    await this.getFeedback(matchSessionId, participantUserId);
    const rules = await this.policyConfig.getConversationFeedbackRules();
    const promptDueAt = new Date(
      now.getTime() + rules.timing.afterContactOpenHours * 60 * 60 * 1000
    );

    return this.prisma.clientInstance.$transaction(async (transaction) => {
      const recorded = await transaction.conversationFeedback.updateMany({
        where: {
          matchSessionId,
          contactOpenedAt: null
        },
        data: {
          contactOpenedAt: now
        }
      });

      if (recorded.count === 0) {
        return { recorded: false };
      }

      await transaction.conversationFeedback.updateMany({
        where: {
          matchSessionId,
          promptedAt: null,
          promptDueAt: { gt: promptDueAt }
        },
        data: { promptDueAt }
      });

      return { recorded: true };
    });
  }

  async findDuePrompts(now = new Date()): Promise<DueConversationFeedbackPrompt[]> {
    const rules = await this.policyConfig.getConversationFeedbackRules();
    const expiresBefore = new Date(
      now.getTime() - rules.timing.expiresAfterDays * 24 * 60 * 60 * 1000
    );
    const claimExpiredBefore = new Date(
      now.getTime() - rules.delivery.claimLeaseMinutes * 60 * 1000
    );
    const feedback = await this.prisma.clientInstance.conversationFeedback.findMany({
      where: {
        promptDueAt: {
          lte: now,
          gt: expiresBefore
        },
        promptedAt: null,
        completedAt: null,
        promptAttempts: { lt: rules.delivery.maxPromptAttempts },
        OR: [
          { promptClaimedAt: null },
          { promptClaimedAt: { lte: claimExpiredBefore } }
        ]
      },
      include: {
        participant: {
          select: { telegramUserId: true }
        }
      },
      orderBy: [{ promptDueAt: "asc" }, { id: "asc" }]
    });

    return feedback.map((item) => ({
      id: item.id,
      telegramUserId: item.participant.telegramUserId,
      callbackToken: item.callbackToken,
      promptClaimedAt: item.promptClaimedAt,
      promptAttempts: item.promptAttempts
    }));
  }

  async claimPromptDelivery(
    prompt: DueConversationFeedbackPrompt,
    now = new Date()
  ): Promise<boolean> {
    const rules = await this.policyConfig.getConversationFeedbackRules();
    const expiresBefore = new Date(
      now.getTime() - rules.timing.expiresAfterDays * 24 * 60 * 60 * 1000
    );
    const claimed = await this.prisma.clientInstance.conversationFeedback.updateMany({
      where: {
        id: prompt.id,
        promptDueAt: {
          lte: now,
          gt: expiresBefore
        },
        promptedAt: null,
        completedAt: null,
        promptClaimedAt: prompt.promptClaimedAt,
        promptAttempts: prompt.promptAttempts
      },
      data: {
        promptClaimedAt: now,
        promptAttempts: { increment: 1 }
      }
    });

    return claimed.count === 1;
  }

  async markPromptDelivered(
    prompt: DueConversationFeedbackPrompt,
    claimedAt: Date,
    deliveredAt = new Date()
  ): Promise<void> {
    await this.prisma.clientInstance.conversationFeedback.updateMany({
      where: {
        id: prompt.id,
        promptClaimedAt: claimedAt,
        promptedAt: null,
        promptAttempts: prompt.promptAttempts + 1
      },
      data: {
        promptClaimedAt: null,
        promptedAt: deliveredAt
      }
    });
  }

  async releasePromptDelivery(
    prompt: DueConversationFeedbackPrompt,
    claimedAt: Date
  ): Promise<void> {
    await this.prisma.clientInstance.conversationFeedback.updateMany({
      where: {
        id: prompt.id,
        promptClaimedAt: claimedAt,
        promptedAt: null,
        promptAttempts: prompt.promptAttempts + 1
      },
      data: { promptClaimedAt: null }
    });
  }

  async submitBotAnswer(
    callbackToken: string,
    telegramUserId: string,
    answer: ConversationFeedbackBotAnswer,
    now = new Date()
  ): Promise<ConversationFeedbackBotSubmitResult> {
    const feedback = await this.prisma.clientInstance.conversationFeedback.findUnique({
      where: { callbackToken },
      include: {
        participant: {
          select: { telegramUserId: true }
        }
      }
    });

    if (!feedback || feedback.participant.telegramUserId !== telegramUserId) {
      return { accepted: false, nextStep: null };
    }

    const currentStep = this.getBotStep(feedback);
    if (currentStep !== answer.step || !this.isAllowedBotAnswer(answer)) {
      return { accepted: false, nextStep: currentStep };
    }

    let write: { count: number };
    let nextStep: ConversationFeedbackBotNextStep;

    switch (answer.step) {
      case "outcome":
        write = await this.prisma.clientInstance.conversationFeedback.updateMany({
          where: {
            id: feedback.id,
            outcome: null,
            completedAt: null
          },
          data: {
            outcome: answer.value,
            value: null,
            obstacle: null,
            nextIntent: null,
            completedAt: null
          }
        });
        nextStep = answer.value === "talked" ? "value" : "obstacle";
        break;
      case "value":
        write = await this.prisma.clientInstance.conversationFeedback.updateMany({
          where: {
            id: feedback.id,
            outcome: "talked",
            value: null,
            completedAt: null
          },
          data: {
            value: answer.value,
            obstacle: null
          }
        });
        nextStep = "next_intent";
        break;
      case "obstacle":
        write = await this.prisma.clientInstance.conversationFeedback.updateMany({
          where: {
            id: feedback.id,
            outcome: feedback.outcome,
            obstacle: null,
            completedAt: null
          },
          data: {
            obstacle: answer.value,
            value: null
          }
        });
        nextStep = "next_intent";
        break;
      case "next_intent":
        write = await this.prisma.clientInstance.conversationFeedback.updateMany({
          where: {
            id: feedback.id,
            outcome: feedback.outcome,
            ...(feedback.outcome === "talked"
              ? { value: feedback.value }
              : { obstacle: feedback.obstacle }),
            nextIntent: null,
            completedAt: null
          },
          data: {
            nextIntent: answer.value,
            completedAt: now
          }
        });
        nextStep = "completed";
        break;
    }

    return write.count === 1
      ? { accepted: true, nextStep }
      : { accepted: false, nextStep: currentStep };
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

  private getBotStep(feedback: ConversationFeedback): ConversationFeedbackBotNextStep {
    if (feedback.completedAt || feedback.nextIntent) {
      return "completed";
    }

    if (!feedback.outcome) {
      return "outcome";
    }

    if (feedback.outcome === "talked" && !feedback.value) {
      return "value";
    }

    if (feedback.outcome !== "talked" && !feedback.obstacle) {
      return "obstacle";
    }

    return "next_intent";
  }

  private isAllowedBotAnswer(answer: ConversationFeedbackBotAnswer): boolean {
    switch (answer.step) {
      case "outcome":
        return isAllowedValue(CONVERSATION_OUTCOMES, answer.value);
      case "value":
        return isAllowedValue(CONVERSATION_VALUES, answer.value);
      case "obstacle":
        return isAllowedValue(CONVERSATION_OBSTACLES, answer.value);
      case "next_intent":
        return isAllowedValue(NEXT_CONVERSATION_INTENTS, answer.value);
    }
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

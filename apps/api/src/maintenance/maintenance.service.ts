import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { BeaconService } from "../modules/beacon/service";
import { ConversationFeedbackBotHandlerService } from "../modules/conversation-feedback/bot-handler.service";
import { ConversationFeedbackService } from "../modules/conversation-feedback/service";
import { MatchingRuntimeService } from "../modules/matching/runtime.service";
import { PrivacyRuntimeService } from "../modules/privacy/runtime.service";
import { BotWebhookService } from "../telegram/bot-webhook.service";

@Injectable()
export class MaintenanceService implements OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceService.name);
  private interval: NodeJS.Timeout | undefined;

  constructor(
    private readonly beacon: BeaconService,
    private readonly matching: MatchingRuntimeService,
    private readonly privacy: PrivacyRuntimeService,
    private readonly conversationFeedback: ConversationFeedbackService,
    private readonly feedbackBotHandler: ConversationFeedbackBotHandlerService,
    private readonly botWebhook: BotWebhookService
  ) {}

  start(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      void this.runSweep();
    }, 5 * 60 * 1000);

    this.logger.log("In-process maintenance scheduler started");
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  async runSweep(now = new Date()): Promise<void> {
    try {
      await this.beacon.expireStaleSessions();
      await this.matching.sweep();
      await this.privacy.cleanupRetention();
      const duePrompts = await this.conversationFeedback.findDuePrompts(now);

      for (const prompt of duePrompts) {
        const claimed = await this.conversationFeedback.claimPromptDelivery(prompt, now);
        if (!claimed) continue;

        try {
          await this.feedbackBotHandler.sendOutcomeQuestion(
            this.botWebhook.getBot(),
            prompt.telegramUserId,
            prompt.callbackToken
          );
          await this.conversationFeedback.markPromptDelivered(prompt, now, now);
        } catch {
          await this.conversationFeedback.releasePromptDelivery(prompt, now);
          this.logger.warn("Conversation feedback prompt delivery attempt failed");
        }
      }

      this.logger.debug("maintenance sweep tick");
    } catch (error) {
      this.logger.error("maintenance sweep failed", error instanceof Error ? error.stack : undefined);
    }
  }
}

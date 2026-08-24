import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { ConversationFeedbackService } from "./modules/conversation-feedback/service";

@Controller("conversation-feedback")
@UseGuards(SessionAuthGuard)
export class ConversationFeedbackController {
  constructor(private readonly conversationFeedback: ConversationFeedbackService) {}

  @Post(":connectionId/contact-opened")
  recordContactOpened(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Param("connectionId") connectionId: string
  ): Promise<{ recorded: boolean }> {
    return this.conversationFeedback.recordContactOpened(connectionId, user.id);
  }
}

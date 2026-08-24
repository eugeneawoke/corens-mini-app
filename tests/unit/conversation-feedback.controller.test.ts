import { describe, expect, it, vi } from "vitest";
import { ConversationFeedbackController } from "../../apps/api/src/conversation-feedback.controller";
import type { ConversationFeedbackService } from "../../apps/api/src/modules/conversation-feedback/service";

describe("ConversationFeedbackController", () => {
  it("records an authenticated actor handoff without accepting a request body", async () => {
    const recordContactOpened = vi.fn().mockResolvedValue({ recorded: true });
    const controller = new ConversationFeedbackController({
      recordContactOpened
    } as unknown as ConversationFeedbackService);

    await expect(
      controller.recordContactOpened({ id: "user-a" } as never, "match-1")
    ).resolves.toEqual({ recorded: true });
    expect(recordContactOpened).toHaveBeenCalledWith("match-1", "user-a");
  });
});

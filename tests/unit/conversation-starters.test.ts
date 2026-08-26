import { describe, expect, it, vi } from "vitest";
import {
  copyConversationStarter,
  selectConversationStarter,
  UNIVERSAL_CONVERSATION_STARTERS
} from "../../apps/miniapp/src/lib/conversation-starters";

const APPROVED_STARTERS = [
  "Привет. Хочешь немного поговорить? Можем начать с любой темы. Можно не подбирать правильные слова.",
  "Привет. Хочешь немного поговорить? С чего тебе было бы проще начать? Я готов тебя послушать.",
  "Привет. Хочешь немного поговорить? Можешь просто рассказать, что сейчас происходит.",
  "Привет. Если хочешь, можем немного поговорить. Необязательно сразу объяснять всё."
] as const;

describe("universal conversation starters", () => {
  it("exposes only the four approved universal messages", () => {
    expect(UNIVERSAL_CONVERSATION_STARTERS).toEqual(APPROVED_STARTERS);
  });

  it("selects stably from only the connection id and reaches the whole pool", () => {
    const ids = Array.from({ length: 100 }, (_, index) => `connection-${index}`);
    const firstPass = ids.map((id) => selectConversationStarter(id));
    const secondPass = ids.map((id) => selectConversationStarter(id));

    expect(selectConversationStarter.length).toBe(1);
    expect(secondPass).toEqual(firstPass);
    expect(new Set(firstPass)).toEqual(new Set(APPROVED_STARTERS));
  });

  it("reports clipboard success without changing the suggested text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const text = APPROVED_STARTERS[0];

    await expect(copyConversationStarter(text, { writeText })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(text);
  });

  it("turns unavailable or rejected clipboard writes into a non-blocking result", async () => {
    await expect(copyConversationStarter(APPROVED_STARTERS[0], undefined)).resolves.toBe(false);
    await expect(
      copyConversationStarter(APPROVED_STARTERS[0], {
        writeText: vi.fn().mockRejectedValue(new Error("denied"))
      })
    ).resolves.toBe(false);
  });
});

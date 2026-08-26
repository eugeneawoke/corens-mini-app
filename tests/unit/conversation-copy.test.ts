import { describe, expect, it } from "vitest";
import { CONVERSATION_COPY } from "../../apps/miniapp/src/lib/conversation-copy";

describe("conversation-focused product copy", () => {
  it("leads with the present conversation need and explains each matching signal", () => {
    expect(CONVERSATION_COPY.entryQuestion).toBe("Какого разговора тебе сейчас не хватает?");
    expect(CONVERSATION_COPY.entryPromise).toBe(
      "Corens помогает найти человека, с которым такой разговор может состояться."
    );
    expect(CONVERSATION_COPY.intentExplanation).toContain("разговор");
    expect(CONVERSATION_COPY.stateExplanation).toContain("контекст");
    expect(CONVERSATION_COPY.trustKeysExplanation).toContain("безопаснее");
  });

  it("describes Beacon as a ready-now mode without location or inferred similarity claims", () => {
    const beaconCopy = [
      CONVERSATION_COPY.beaconIntro,
      CONVERSATION_COPY.beaconActive,
      CONVERSATION_COPY.beaconInactive
    ].join(" ");

    expect(beaconCopy).toContain("сейчас");
    expect(beaconCopy).not.toMatch(/рядом|похож/i);
  });

  it("does not promise internal chat or knowledge of private needs and experience", () => {
    const allCopy = Object.values(CONVERSATION_COPY).join(" ");

    expect(allCopy).not.toMatch(/мы понимаем|похожий опыт|прочитаем|внутри Corens/i);
  });
});

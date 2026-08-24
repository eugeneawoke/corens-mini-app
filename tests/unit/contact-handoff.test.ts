import { describe, expect, it, vi } from "vitest";
import {
  openTelegramLink,
  startContactHandoff
} from "../../apps/miniapp/src/lib/contact-handoff";

describe("startContactHandoff", () => {
  it("opens Telegram immediately and tracks only the opaque connection id", () => {
    let rejectTracking!: (error: Error) => void;
    const tracking = new Promise<void>((_resolve, reject) => {
      rejectTracking = reject;
    });
    const track = vi.fn().mockReturnValue(tracking);
    const openTelegram = vi.fn();

    startContactHandoff("match-1", track, openTelegram);

    expect(track).toHaveBeenCalledWith("match-1");
    expect(openTelegram).toHaveBeenCalledOnce();

    rejectTracking(new Error("tracking unavailable"));
  });
});

describe("openTelegramLink", () => {
  it("falls back to browser navigation when Telegram APIs are unavailable", () => {
    const browserWindow = { location: { href: "" } };

    openTelegramLink("tg://user?id=123", browserWindow as never);

    expect(browserWindow.location.href).toBe("tg://user?id=123");
  });
});

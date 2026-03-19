import { describe, expect, it, vi } from "vitest";
import type { ConnectionSummary } from "@corens/domain";
import { MatchingController } from "../../apps/api/src/matching.controller";
import type { MatchingRuntimeService } from "../../apps/api/src/modules/matching/runtime.service";

function createResponseDouble() {
  return {
    type: vi.fn(),
    send: vi.fn()
  };
}

describe("MatchingController", () => {
  it("serializes a missing current connection as JSON null", async () => {
    const matching = {
      getCurrentConnection: vi.fn().mockResolvedValue(null)
    } as unknown as MatchingRuntimeService;
    const controller = new MatchingController(matching);
    const response = createResponseDouble();

    await controller.getCurrentConnection({ id: "user-1" } as never, response as never);

    expect(response.type).toHaveBeenCalledWith("application/json");
    expect(response.send).toHaveBeenCalledWith("null");
  });

  it("serializes an active connection as JSON", async () => {
    const connection: ConnectionSummary = {
      kind: "active",
      displayName: "Alex",
      matchScore: 87,
      trustLevel: 3,
      sharedKeys: ["night walks"],
      sharedState: "Общий ритм состояния",
      statusCopy: "Связь найдена автоматическим matching pipeline.",
      contactConsent: {
        channel: "contact",
        status: "pending",
        warnings: []
      },
      photoConsent: {
        channel: "photo",
        status: "pending",
        warnings: []
      }
    };
    const matching = {
      getCurrentConnection: vi.fn().mockResolvedValue(connection)
    } as unknown as MatchingRuntimeService;
    const controller = new MatchingController(matching);
    const response = createResponseDouble();

    await controller.getCurrentConnection({ id: "user-1" } as never, response as never);

    expect(response.send).toHaveBeenCalledWith(JSON.stringify(connection));
  });
});

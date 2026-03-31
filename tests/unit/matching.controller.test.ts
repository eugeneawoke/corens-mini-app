import { describe, expect, it, vi } from "vitest";
import type { ConnectionSummary } from "@corens/domain";
import { MatchingController } from "../../apps/api/src/matching.controller";
import type { MatchingRuntimeService } from "../../apps/api/src/modules/matching/runtime.service";

describe("MatchingController", () => {
  it("returns the current connection list", async () => {
    const connections: ConnectionSummary[] = [];
    const matching = {
      getConnections: vi.fn().mockResolvedValue(connections)
    } as unknown as MatchingRuntimeService;
    const controller = new MatchingController(matching);

    await expect(controller.getConnections({ id: "user-1" } as never)).resolves.toEqual(connections);
  });

  it("returns a connection by id", async () => {
    const connection: ConnectionSummary = {
      kind: "active",
      id: "match-1",
      displayName: "Alex",
      matchScore: 87,
      trustLevel: 3,
      sharedKeys: ["night walks"],
      sharedState: "Общий ритм состояния",
      statusCopy: "Связь найдена автоматическим matching pipeline.",
      contactConsent: {
        channel: "contact",
        status: "pending",
        myDecision: "pending",
        peerRequested: false,
        warnings: []
      },
      photoConsent: {
        channel: "photo",
        status: "pending",
        myDecision: "pending",
        peerRequested: false,
        warnings: []
      }
    };
    const matching = {
      getConnectionById: vi.fn().mockResolvedValue(connection)
    } as unknown as MatchingRuntimeService;
    const controller = new MatchingController(matching);

    await expect(
      controller.getConnectionById({ id: "user-1" } as never, "match-1")
    ).resolves.toEqual(connection);
  });
});

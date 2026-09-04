import { describe, expect, it } from "vitest";
import type { ConnectionSummary, ConsentStatusView } from "@corens/domain";
import { rankConnectionSummaries } from "../../apps/api/src/modules/matching/connection-priority";

function activeConnection(
  id: string,
  contactConsent: ConsentStatusView
): ConnectionSummary {
  return {
    kind: "active",
    id,
    displayName: id,
    about: null,
    matchScore: 0,
    trustLevel: 1,
    sharedKeys: [],
    sharedState: "shared state",
    statusCopy: "status",
    contactConsent,
    photoConsent: {
      channel: "photo",
      status: "pending",
      myDecision: "pending",
      peerRequested: false,
      warnings: []
    }
  };
}

describe("rankConnectionSummaries", () => {
  it("groups interleaved actionable connections while preserving newest query order inside each tier", () => {
    const neutralNewest = activeConnection("neutral-newest", {
      channel: "contact",
      status: "pending",
      myDecision: "approved",
      peerRequested: true,
      warnings: []
    });
    const mutualNewest = activeConnection("mutual-newest", {
      channel: "contact",
      status: "approved",
      myDecision: "approved",
      peerRequested: true,
      warnings: []
    });
    const inboundNewest = activeConnection("inbound-newest", {
      channel: "contact",
      status: "pending",
      myDecision: "pending",
      peerRequested: true,
      warnings: []
    });
    const mutualOlder = activeConnection("mutual-older", {
      channel: "contact",
      status: "approved",
      myDecision: "approved",
      peerRequested: false,
      warnings: []
    });
    const inboundOlder = activeConnection("inbound-older", {
      channel: "contact",
      status: "pending",
      myDecision: "pending",
      peerRequested: true,
      warnings: []
    });
    const neutralOlder = activeConnection("neutral-older", {
      channel: "contact",
      status: "pending",
      myDecision: "pending",
      peerRequested: false,
      warnings: []
    });
    const peerDeleted: ConnectionSummary = {
      kind: "peer_deleted",
      title: "Unavailable",
      description: "Peer deleted their profile",
      statusCopy: "Closed",
      primaryActionLabel: "Return"
    };

    const ranked = rankConnectionSummaries([
      neutralNewest,
      mutualNewest,
      peerDeleted,
      inboundNewest,
      mutualOlder,
      inboundOlder,
      neutralOlder
    ]);

    expect(ranked.map((connection) => (connection.kind === "active" ? connection.id : connection.kind))).toEqual([
      "mutual-newest",
      "mutual-older",
      "inbound-newest",
      "inbound-older",
      "neutral-newest",
      "neutral-older",
      "peer_deleted"
    ]);
  });
});

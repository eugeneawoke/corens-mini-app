import type { ActiveConnectionSummary } from "@corens/domain";

export type ConnectionCardState = "ready" | "incoming" | "default";

export function getConnectionCardState(
  connection: Pick<ActiveConnectionSummary, "contactConsent">
): ConnectionCardState {
  if (connection.contactConsent.status === "approved") {
    return "ready";
  }

  if (
    connection.contactConsent.status === "pending" &&
    connection.contactConsent.myDecision === "pending" &&
    connection.contactConsent.peerRequested
  ) {
    return "incoming";
  }

  return "default";
}

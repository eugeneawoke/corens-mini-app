import type { ConnectionSummary } from "@corens/domain";

export function rankConnectionSummaries(
  connections: readonly ConnectionSummary[]
): ConnectionSummary[] {
  return connections
    .map((connection, index) => ({ connection, index }))
    .sort((left, right) => connectionPriority(left.connection) - connectionPriority(right.connection) || left.index - right.index)
    .map(({ connection }) => connection);
}

function connectionPriority(connection: ConnectionSummary): number {
  if (connection.kind === "peer_deleted") {
    return 3;
  }

  if (connection.contactConsent.status === "approved") {
    return 0;
  }

  if (
    connection.contactConsent.status === "pending" &&
    connection.contactConsent.myDecision === "pending" &&
    connection.contactConsent.peerRequested
  ) {
    return 1;
  }

  return 2;
}

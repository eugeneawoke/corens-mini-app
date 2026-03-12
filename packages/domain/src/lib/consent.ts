import type { ConsentChannel, ConsentDecision } from "./enums";

export interface ConsentRequest {
  matchSessionId: string;
  requestedByUserId: string;
  channel: ConsentChannel;
  decisionByActor: ConsentDecision;
  decisionByPeer: ConsentDecision;
}

export interface ConsentArtifact {
  channel: ConsentChannel;
  exposedAt?: string;
  artifactType: "telegram_deep_link" | "photo_asset";
}

import type { ConsentArtifact, ConsentRequest } from "./consent";

export interface ConsentPolicyConfig {
  contact: {
    requiresMutualConsent: boolean;
    softWarningRequired: boolean;
    exposedArtifact: "telegram_deep_link";
  };
  photo: {
    requiresMutualConsent: boolean;
    exposedArtifact: "photo_asset";
  };
}

export interface ConsentResolution {
  status: "pending" | "approved" | "declined";
  artifact?: ConsentArtifact;
  warnings: string[];
}

export function resolveConsentRequest(
  request: ConsentRequest,
  config: ConsentPolicyConfig
): ConsentResolution {
  const channelConfig = request.channel === "contact" ? config.contact : config.photo;
  const warnings: string[] = [];

  if (request.channel === "contact" && config.contact.softWarningRequired) {
    warnings.push("telegram_handoff_warning_required");
  }

  const actorApproved = request.decisionByActor === "approved";
  const peerApproved = request.decisionByPeer === "approved";
  const anyDeclined =
    request.decisionByActor === "declined" || request.decisionByPeer === "declined";

  if (anyDeclined) {
    return {
      status: "declined",
      warnings
    };
  }

  if (channelConfig.requiresMutualConsent && !(actorApproved && peerApproved)) {
    return {
      status: "pending",
      warnings
    };
  }

  return {
    status: "approved",
    artifact: {
      channel: request.channel,
      artifactType: channelConfig.exposedArtifact
    },
    warnings
  };
}

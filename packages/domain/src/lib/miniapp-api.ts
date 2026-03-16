import type { BeaconStatus, ConsentChannel, ConsentDecision } from "./enums";
import type { VisibilityState } from "./privacy";
import type { DeletionPlan } from "./privacy-policy";

export interface SelectOption {
  key: string;
  label: string;
  description: string;
}

export interface ProfileSummary {
  onboardingCompleted: boolean;
  profile: {
    displayName: string;
    handle: string;
  };
  state: {
    current: SelectOption;
    options: ReadonlyArray<SelectOption>;
    cooldownLabel: string;
  };
  intent: {
    current: SelectOption;
    options: ReadonlyArray<SelectOption>;
  };
  trustKeys: {
    selected: string[];
    groups: ReadonlyArray<{
      title: string;
      items: ReadonlyArray<string>;
    }>;
    limitLabel: string;
    cooldownLabel: string;
  };
  privacy: {
    visibility: VisibilityState;
    privacyCopy: string;
    switches: ReadonlyArray<{
      title: string;
      description: string;
      checked: boolean;
    }>;
    deletionPlan: DeletionPlan;
  };
}

export interface ConsentStatusView {
  channel: ConsentChannel;
  status: "pending" | "approved" | "declined";
  warnings: string[];
  artifactType?: "telegram_deep_link" | "photo_asset";
}

export interface ConnectionSummary {
  displayName: string;
  matchScore: number;
  trustLevel: number;
  sharedKeys: string[];
  sharedState: string;
  statusCopy: string;
  contactConsent: ConsentStatusView;
  photoConsent: ConsentStatusView;
}

export interface BeaconSummary {
  status: BeaconStatus;
  remainingLabel: string;
  description: string;
  durationLabel: string;
  cooldownLabel?: string;
}

export interface HomeSummary {
  onboardingCompleted: boolean;
  profile: ProfileSummary["profile"];
  state: ProfileSummary["state"]["current"];
  intent: ProfileSummary["intent"]["current"];
  beacon: BeaconSummary;
  connection: ConnectionSummary | null;
}

export interface UpdateStateIntentRequest {
  stateKey: string;
  intentKey: string;
}

export interface UpdateTrustKeysRequest {
  trustKeys: string[];
}

export interface CompleteOnboardingRequest {
  displayName: string;
  stateKey: string;
  intentKey: string;
  trustKeys: string[];
}

export interface ConsentDecisionRequest {
  decision: ConsentDecision;
}

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
    gender: string;
    partnerGender: string;
    about: string | null;
  };
  photo: {
    hasPhoto: boolean;
    statusLabel: string;
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
    isOnCooldown: boolean;
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
  myDecision: "pending" | "approved" | "declined";
  warnings: string[];
  artifactType?: "telegram_deep_link" | "photo_asset";
  artifactValue?: string;
}

export interface ActiveConnectionSummary {
  kind: "active";
  id: string;
  displayName: string;
  matchScore: number;
  trustLevel: number;
  sharedKeys: string[];
  sharedState: string;
  statusCopy: string;
  contactConsent: ConsentStatusView;
  photoConsent: ConsentStatusView;
}

export interface PeerDeletedConnectionSummary {
  kind: "peer_deleted";
  title: string;
  description: string;
  statusCopy: string;
  primaryActionLabel: string;
}

export type ConnectionSummary = ActiveConnectionSummary | PeerDeletedConnectionSummary;

export interface BeaconSummary {
  status: BeaconStatus;
  remainingLabel: string;
  description: string;
  durationLabel: string;
  expiresAt?: string;
  cooldownLabel?: string;
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
  gender: string;
  stateKey: string;
  intentKey: string;
  trustKeys: string[];
}

export interface UpdateGenderPreferenceRequest {
  partnerGender: string;
}

export interface UpdateAboutRequest {
  about: string;
}

export interface UpdateVisibilityRequest {
  isHidden: boolean;
}

export interface DeleteAccountRequest {
  confirmation: string;
}

export interface ModerationActionRequest {
  note?: string;
  connectionId: string;
}

export interface ConsentDecisionRequest {
  decision: ConsentDecision;
}

export interface AuthBootstrapRequest {
  initData: string;
}

export interface AuthenticatedMiniAppUser {
  id: string;
  telegramUserId: string;
  telegramUsername: string | null;
}

export interface AuthBootstrapResponse {
  sessionToken: string;
  expiresAt: string;
  user: AuthenticatedMiniAppUser;
  profile: ProfileSummary;
}

export interface PhotoSummary {
  hasPhoto: boolean;
  status: "missing" | "ready";
  statusCopy: string;
  previewUrl?: string;
}

export interface PhotoUploadIntent {
  uploadUrl: string;
  authorizationToken: string;
  objectKey: string;
  intentToken: string;
  expiresAt: string;
  maxBytes: number;
  allowedMimeTypes: string[];
}

export interface CreatePhotoUploadIntentRequest {
  contentType: string;
}

export interface ConfirmPhotoUploadRequest {
  intentToken: string;
  fileId: string;
  contentType: string;
  sizeBytes: number;
}

export interface PhotoRevealSummary {
  state: "locked" | "ready" | "photo_missing";
  title: string;
  description: string;
  imageUrl?: string;
}

import type { DeletionSnapshot, VisibilityState } from "./privacy";

export interface PrivacyRules {
  hiddenProfileClosesPendingConnection: boolean;
  deletion: {
    revokeSessionsImmediately: boolean;
    expireBeaconImmediately: boolean;
    closeOpenConsentsImmediately: boolean;
  };
}

export interface DeletionPlan {
  nextVisibility: VisibilityState;
  stages: DeletionSnapshot["stage"][];
  sideEffects: string[];
}

export function hideProfile(current: VisibilityState): VisibilityState {
  return {
    ...current,
    isHidden: true,
    matchingEnabled: false
  };
}

export function restoreProfile(current: VisibilityState): VisibilityState {
  return {
    ...current,
    isHidden: false,
    matchingEnabled: true
  };
}

export function planDeletion(
  current: VisibilityState,
  rules: PrivacyRules
): DeletionPlan {
  const sideEffects: string[] = [];

  if (rules.deletion.revokeSessionsImmediately) {
    sideEffects.push("revoke_sessions");
  }

  if (rules.deletion.expireBeaconImmediately) {
    sideEffects.push("expire_beacon");
  }

  if (rules.deletion.closeOpenConsentsImmediately) {
    sideEffects.push("close_open_consents");
  }

  if (!rules.hiddenProfileClosesPendingConnection) {
    sideEffects.push("preserve_already_found_pending_connection");
  }

  sideEffects.push("delete_media_bytes");
  sideEffects.push("purge_profile_data");
  sideEffects.push("close_peer_connections_with_system_notice");
  sideEffects.push("record_aggregate_deletion_analytics");

  return {
    nextVisibility: hideProfile(current),
    stages: [
      "pending",
      "sessions_revoked",
      "consents_closed",
      "assets_deleted",
      "purged",
      "completed"
    ],
    sideEffects
  };
}

export interface VisibilityState {
  userId: string;
  isHidden: boolean;
  matchingEnabled: boolean;
}

export interface DeletionSnapshot {
  userId: string;
  requestedAt: string;
  stage:
    | "pending"
    | "sessions_revoked"
    | "consents_closed"
    | "assets_deleted"
    | "purged"
    | "completed";
}

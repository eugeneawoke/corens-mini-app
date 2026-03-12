import type { VisibilityState } from "@corens/domain";
import { hideProfile, planDeletion, restoreProfile } from "@corens/domain";

type PrivacyServiceDependencies = {
  rules: {
    hiddenProfileClosesPendingConnection: boolean;
    deletion: {
      revokeSessionsImmediately: boolean;
      expireBeaconImmediately: boolean;
      closeOpenConsentsImmediately: boolean;
    };
  };
};

export class PrivacyService {
  constructor(private readonly deps: PrivacyServiceDependencies) {}

  hide(current: VisibilityState) {
    return hideProfile(current);
  }

  restore(current: VisibilityState) {
    return restoreProfile(current);
  }

  createDeletionPlan(current: VisibilityState) {
    return planDeletion(current, this.deps.rules);
  }
}

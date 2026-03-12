import { Injectable } from "@nestjs/common";
import type {
  BeaconSummary,
  ConnectionSummary,
  ConsentChannel,
  ConsentDecision,
  ConsentStatusView,
  HomeSummary,
  ProfileSummary,
  UpdateStateIntentRequest,
  UpdateTrustKeysRequest
} from "@corens/domain";
import {
  createBeaconSummary,
  createConnectionSummary,
  createConsentStatus,
  createDemoMvpState,
  createHomeSummary,
  createProfileSummary,
  type DemoMvpState
} from "@corens/domain";

@Injectable()
export class MvpDemoStoreService {
  private readonly state: DemoMvpState = createDemoMvpState();

  getHomeSummary(): HomeSummary {
    return createHomeSummary(this.state);
  }

  getProfileSummary(): ProfileSummary {
    return createProfileSummary(this.state);
  }

  updateStateIntent(input: UpdateStateIntentRequest): ProfileSummary {
    this.state.profile.stateKey = input.stateKey;
    this.state.profile.intentKey = input.intentKey;

    if (this.state.connection) {
      this.state.connection.selfCandidate.stateKey = input.stateKey;
      this.state.connection.selfCandidate.intentKey = input.intentKey;
    }

    return this.getProfileSummary();
  }

  updateTrustKeys(input: UpdateTrustKeysRequest): ProfileSummary {
    this.state.profile.trustKeys = [...input.trustKeys];

    if (this.state.connection) {
      this.state.connection.selfCandidate.trustKeys = input.trustKeys.map((item) =>
        item.toLowerCase()
      );
    }

    return this.getProfileSummary();
  }

  getBeaconSummary(): BeaconSummary {
    return createBeaconSummary(this.state);
  }

  activateBeacon(): BeaconSummary {
    this.state.beacon.status = "active";
    this.state.beacon.remainingLabel = "1:58:32";
    this.state.beacon.cooldownLabel = undefined;
    return this.getBeaconSummary();
  }

  getCurrentConnection(): ConnectionSummary | null {
    return createConnectionSummary(this.state);
  }

  getConsentStatus(channel: ConsentChannel): ConsentStatusView | null {
    const connection = this.getCurrentConnection();

    if (!connection) {
      return null;
    }

    return channel === "contact" ? connection.contactConsent : connection.photoConsent;
  }

  updateConsent(channel: ConsentChannel, decision: ConsentDecision): ConsentStatusView | null {
    if (!this.state.connection) {
      return null;
    }

    if (channel === "contact") {
      this.state.connection.contactActorDecision = decision;
      return createConsentStatus(
        "contact",
        this.state.connection.contactActorDecision,
        this.state.connection.contactPeerDecision
      );
    }

    this.state.connection.photoActorDecision = decision;
    return createConsentStatus(
      "photo",
      this.state.connection.photoActorDecision,
      this.state.connection.photoPeerDecision
    );
  }
}

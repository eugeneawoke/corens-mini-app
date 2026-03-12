import {
  createBeaconSummary,
  createConnectionSummary,
  createDemoMvpState,
  createHomeSummary,
  createProfileSummary
} from "@corens/domain";

export function getMvpSnapshot() {
  const state = createDemoMvpState();

  return {
    home: createHomeSummary(state),
    profile: createProfileSummary(state),
    beacon: createBeaconSummary(state),
    connection: createConnectionSummary(state)
  };
}

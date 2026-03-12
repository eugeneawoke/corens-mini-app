import type { ConsentRequest } from "@corens/domain";
import { resolveConsentRequest } from "@corens/domain";

type ConsentServiceDependencies = {
  config: {
    contact: {
      requiresMutualConsent: boolean;
      softWarningRequired: boolean;
      exposedArtifact: "telegram_deep_link";
    };
    photo: {
      requiresMutualConsent: boolean;
      exposedArtifact: "photo_asset";
    };
  };
};

export class ConsentsService {
  constructor(private readonly deps: ConsentServiceDependencies) {}

  resolve(request: ConsentRequest) {
    return resolveConsentRequest(request, this.deps.config);
  }
}

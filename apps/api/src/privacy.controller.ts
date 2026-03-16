import { Body, Controller, Patch, Post } from "@nestjs/common";
import type { DeleteAccountRequest, UpdateVisibilityRequest } from "@corens/domain";
import { PrivacyRuntimeService } from "./modules/privacy/runtime.service";
import { ProfilesService } from "./modules/profiles";

@Controller("privacy")
export class PrivacyController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly privacy: PrivacyRuntimeService
  ) {}

  @Patch("visibility")
  updateVisibility(@Body() body: UpdateVisibilityRequest) {
    return this.profiles.updateVisibility(body);
  }

  @Post("delete-request")
  requestDeletion(@Body() body: DeleteAccountRequest) {
    return this.privacy.requestDeletion(body.confirmation);
  }
}

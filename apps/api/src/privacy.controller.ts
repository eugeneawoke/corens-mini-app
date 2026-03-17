import { Body, Controller, Patch, Post, UseGuards } from "@nestjs/common";
import type { DeleteAccountRequest, UpdateVisibilityRequest } from "@corens/domain";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { PrivacyRuntimeService } from "./modules/privacy/runtime.service";
import { ProfilesService } from "./modules/profiles";

@Controller("privacy")
@UseGuards(SessionAuthGuard)
export class PrivacyController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly privacy: PrivacyRuntimeService
  ) {}

  @Patch("visibility")
  updateVisibility(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: UpdateVisibilityRequest
  ) {
    return this.profiles.updateVisibility(user, body);
  }

  @Post("delete-request")
  requestDeletion(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: DeleteAccountRequest
  ) {
    return this.privacy.requestDeletion(user, body.confirmation);
  }
}

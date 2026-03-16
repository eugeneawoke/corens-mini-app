import { Body, Controller, Patch } from "@nestjs/common";
import type { UpdateVisibilityRequest } from "@corens/domain";
import { ProfilesService } from "./modules/profiles";

@Controller("privacy")
export class PrivacyController {
  constructor(private readonly profiles: ProfilesService) {}

  @Patch("visibility")
  updateVisibility(@Body() body: UpdateVisibilityRequest) {
    return this.profiles.updateVisibility(body);
  }
}

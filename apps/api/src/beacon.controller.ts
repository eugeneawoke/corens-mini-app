import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { BeaconService } from "./modules/beacon/service";

@Controller("beacon")
@UseGuards(SessionAuthGuard)
export class BeaconController {
  constructor(private readonly beacon: BeaconService) {}

  @Get("status")
  getStatus(@AuthenticatedUser() user: AuthenticatedUserContext) {
    return this.beacon.getSummary(user);
  }

  @Post("activate")
  activate(@AuthenticatedUser() user: AuthenticatedUserContext) {
    return this.beacon.activate(user);
  }
}

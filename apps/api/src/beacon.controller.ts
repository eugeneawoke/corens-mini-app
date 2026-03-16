import { Controller, Get, Post } from "@nestjs/common";
import { BeaconService } from "./modules/beacon/service";

@Controller("beacon")
export class BeaconController {
  constructor(private readonly beacon: BeaconService) {}

  @Get("status")
  getStatus() {
    return this.beacon.getSummary();
  }

  @Post("activate")
  activate() {
    return this.beacon.activate();
  }
}

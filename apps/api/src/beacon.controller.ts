import { Controller, Get, Post } from "@nestjs/common";
import { MvpDemoStoreService } from "./mvp-demo-store.service";

@Controller("beacon")
export class BeaconController {
  constructor(private readonly store: MvpDemoStoreService) {}

  @Get("status")
  getStatus() {
    return this.store.getBeaconSummary();
  }

  @Post("activate")
  activate() {
    return this.store.activateBeacon();
  }
}

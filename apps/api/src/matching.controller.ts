import { Controller, Get } from "@nestjs/common";
import { MvpDemoStoreService } from "./mvp-demo-store.service";

@Controller("matching")
export class MatchingController {
  constructor(private readonly store: MvpDemoStoreService) {}

  @Get("current-connection")
  getCurrentConnection() {
    return this.store.getCurrentConnection();
  }
}

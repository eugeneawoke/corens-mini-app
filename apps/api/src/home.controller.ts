import { Controller, Get } from "@nestjs/common";
import { MvpDemoStoreService } from "./mvp-demo-store.service";

@Controller("home")
export class HomeController {
  constructor(private readonly store: MvpDemoStoreService) {}

  @Get("summary")
  getSummary() {
    return this.store.getHomeSummary();
  }
}

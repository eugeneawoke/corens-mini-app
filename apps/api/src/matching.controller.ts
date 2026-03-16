import { Controller, Get } from "@nestjs/common";
import { MatchingRuntimeService } from "./modules/matching/runtime.service";

@Controller("matching")
export class MatchingController {
  constructor(private readonly matching: MatchingRuntimeService) {}

  @Get("current-connection")
  getCurrentConnection() {
    return this.matching.getCurrentConnection();
  }
}

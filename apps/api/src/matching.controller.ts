import { Controller, Get } from "@nestjs/common";

@Controller("matching")
export class MatchingController {
  @Get("current-connection")
  getCurrentConnection() {
    return null;
  }
}

import { Controller, Get } from "@nestjs/common";
import { HomeService } from "./home.service";

@Controller("home")
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get("summary")
  getSummary() {
    return this.home.getSummary();
  }
}

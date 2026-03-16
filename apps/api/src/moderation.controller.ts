import { Body, Controller, Post } from "@nestjs/common";
import type { ModerationActionRequest } from "@corens/domain";
import { ModerationRuntimeService } from "./modules/moderation/runtime.service";

@Controller("moderation")
export class ModerationController {
  constructor(private readonly moderation: ModerationRuntimeService) {}

  @Post("report")
  report(@Body() body: ModerationActionRequest) {
    return this.moderation.report(body.note);
  }

  @Post("block")
  block(@Body() body: ModerationActionRequest) {
    return this.moderation.block(body.note);
  }
}

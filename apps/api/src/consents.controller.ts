import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import type { ConsentChannel, ConsentDecisionRequest } from "@corens/domain";

@Controller("consents")
export class ConsentsController {
  @Get(":channel")
  getStatus(@Param("channel") channel: ConsentChannel) {
    void channel;
    const status = null;

    if (!status) {
      throw new NotFoundException("Consent status is unavailable");
    }

    return status;
  }

  @Post(":channel")
  updateStatus(
    @Param("channel") channel: ConsentChannel,
    @Body() body: ConsentDecisionRequest
  ) {
    void channel;
    void body;
    const status = null;

    if (!status) {
      throw new NotFoundException("Consent status is unavailable");
    }

    return status;
  }
}

import { Body, Controller, Delete, Get, Post, Query, Res, UseGuards } from "@nestjs/common";
import type {
  ConfirmPhotoUploadRequest,
  CreatePhotoUploadIntentRequest
} from "@corens/domain";
import type { Response } from "express";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { MediaService } from "./modules/media/service";

@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get("photo/access")
  async accessPhoto(@Query("token") token: string, @Res() response: Response): Promise<void> {
    const asset = await this.media.streamPhoto(token);
    response.setHeader("content-type", asset.contentType);
    response.setHeader("cache-control", "private, max-age=300");
    response.send(asset.buffer);
  }

  @UseGuards(SessionAuthGuard)
  @Get("photo")
  getPhotoSummary(@AuthenticatedUser() user: AuthenticatedUserContext) {
    return this.media.getPhotoSummary(user);
  }

  @UseGuards(SessionAuthGuard)
  @Post("photo/upload-intent")
  createUploadIntent(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: CreatePhotoUploadIntentRequest
  ) {
    return this.media.createUploadIntent(user, body);
  }

  @UseGuards(SessionAuthGuard)
  @Post("photo/confirm")
  confirmUpload(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: ConfirmPhotoUploadRequest
  ) {
    return this.media.confirmUpload(user, body);
  }

  @UseGuards(SessionAuthGuard)
  @Delete("photo")
  deletePhoto(@AuthenticatedUser() user: AuthenticatedUserContext) {
    return this.media.deletePhoto(user);
  }

  @UseGuards(SessionAuthGuard)
  @Get("photo-reveal")
  getPhotoRevealSummary(@AuthenticatedUser() user: AuthenticatedUserContext) {
    return this.media.getPhotoRevealSummary(user);
  }
}

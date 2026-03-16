import { Injectable } from "@nestjs/common";
import type { BeaconSummary } from "@corens/domain";
import { PrismaService } from "../../prisma.service";
import { ProfilesService } from "../profiles";

const BEACON_DURATION_MINUTES = 120;
const BEACON_COOLDOWN_MINUTES = 180;

@Injectable()
export class BeaconService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService
  ) {}

  async getSummary(): Promise<BeaconSummary> {
    const record = await this.profiles.getCurrentProfileRecord();
    const now = new Date();
    const activeSession = await this.prisma.clientInstance.beaconSession.findFirst({
      where: {
        userId: record.user.id,
        status: "active",
        expiresAt: { gt: now }
      },
      orderBy: { expiresAt: "desc" }
    });

    if (activeSession) {
      return {
        status: "active",
        remainingLabel: this.formatRemaining(activeSession.expiresAt, now),
        description:
          "Режим ручного поиска включается на фиксированное время и не заменяет автоматический matching.",
        durationLabel: "2 часа"
      };
    }

    const cooldownSession = await this.prisma.clientInstance.beaconSession.findFirst({
      where: {
        userId: record.user.id,
        cooldownUntil: { gt: now }
      },
      orderBy: { cooldownUntil: "desc" }
    });

    return {
      status: cooldownSession ? "cooldown" : "inactive",
      remainingLabel: "2:00:00",
      description:
        "Режим ручного поиска включается на фиксированное время и не заменяет автоматический matching.",
      durationLabel: "2 часа",
      cooldownLabel: cooldownSession?.cooldownUntil
        ? this.formatRemaining(cooldownSession.cooldownUntil, now)
        : undefined
    };
  }

  async activate(): Promise<BeaconSummary> {
    const record = await this.profiles.getCurrentProfileRecord();

    if (!record.profile.onboardingCompleted) {
      return this.getSummary();
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + BEACON_DURATION_MINUTES * 60_000);
    const cooldownUntil = new Date(expiresAt.getTime() + BEACON_COOLDOWN_MINUTES * 60_000);

    await this.prisma.clientInstance.beaconSession.updateMany({
      where: {
        userId: record.user.id,
        status: "active"
      },
      data: {
        status: "expired"
      }
    });

    await this.prisma.clientInstance.beaconSession.create({
      data: {
        userId: record.user.id,
        status: "active",
        durationMinutes: BEACON_DURATION_MINUTES,
        expiresAt,
        cooldownUntil
      }
    });

    return this.getSummary();
  }

  private formatRemaining(target: Date, now: Date): string {
    const diffMs = Math.max(target.getTime() - now.getTime(), 0);
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }
}

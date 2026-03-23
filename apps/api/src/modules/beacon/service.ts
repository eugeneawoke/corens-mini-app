import { Injectable } from "@nestjs/common";
import type { BeaconSummary } from "@corens/domain";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import type { AuthenticatedUserContext } from "../auth/service";
import { ProfilesService } from "../profiles";

@Injectable()
export class BeaconService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly policyConfig: PolicyConfigService
  ) {}

  async getSummary(user: AuthenticatedUserContext): Promise<BeaconSummary> {
    await this.expireStaleSessions();
    const record = await this.profiles.getCurrentProfileRecord(user);
    const rules = await this.policyConfig.getBeaconRules();
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
        durationLabel: this.formatMinutes(activeSession.durationMinutes),
        expiresAt: activeSession.expiresAt.toISOString()
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
      remainingLabel: this.formatMinutes(this.defaultDurationMinutes(rules)),
      description:
        "Режим ручного поиска включается на фиксированное время и не заменяет автоматический matching.",
      durationLabel: this.formatMinutes(this.defaultDurationMinutes(rules)),
      cooldownLabel: cooldownSession?.cooldownUntil
        ? this.formatRemaining(cooldownSession.cooldownUntil, now)
        : undefined
    };
  }

  async activate(user: AuthenticatedUserContext, requestedDuration?: number): Promise<BeaconSummary> {
    const record = await this.profiles.getCurrentProfileRecord(user);
    const rules = await this.policyConfig.getBeaconRules();

    if (!record.profile.onboardingCompleted) {
      return this.getSummary(user);
    }

    const now = new Date();
    const durationMinutes = this.selectDuration(rules, requestedDuration);
    const expiresAt = new Date(now.getTime() + durationMinutes * 60_000);
    const cooldownUntil = new Date(expiresAt.getTime() + rules.cooldownMinutes * 60_000);
    const activationsToday = await this.prisma.clientInstance.beaconSession.count({
      where: {
        userId: record.user.id,
        activatedAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
      }
    });

    if (activationsToday >= rules.activationsPerDay) {
      return this.getSummary(user);
    }

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
        durationMinutes,
        expiresAt,
        cooldownUntil
      }
    });

    return this.getSummary(user);
  }

  private formatRemaining(target: Date, now: Date): string {
    const diffMs = Math.max(target.getTime() - now.getTime(), 0);
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  async expireStaleSessions(): Promise<void> {
    await this.prisma.clientInstance.beaconSession.updateMany({
      where: {
        status: "active",
        expiresAt: { lte: new Date() }
      },
      data: {
        status: "expired"
      }
    });
  }

  async deactivate(user: AuthenticatedUserContext): Promise<void> {
    const record = await this.profiles.getCurrentProfileRecord(user);
    await this.prisma.clientInstance.beaconSession.updateMany({
      where: { userId: record.user.id, status: "active" },
      data: { status: "expired" }
    });
  }

  private selectDuration(rules: { intervalsMinutes: number[] }, requested?: number): number {
    if (requested !== undefined && rules.intervalsMinutes.includes(requested)) {
      return requested;
    }
    return this.defaultDurationMinutes(rules);
  }

  private defaultDurationMinutes(rules: { intervalsMinutes: number[] }): number {
    return [...rules.intervalsMinutes].sort((left, right) => right - left)[0] ?? 60;
  }

  private formatMinutes(minutes: number): string {
    if (minutes >= 60 && minutes % 60 === 0) {
      return `${minutes / 60} ч`;
    }

    return `${minutes} мин`;
  }
}

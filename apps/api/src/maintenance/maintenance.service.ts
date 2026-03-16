import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { BeaconService } from "../modules/beacon/service";
import { MatchingRuntimeService } from "../modules/matching/runtime.service";
import { PrivacyRuntimeService } from "../modules/privacy/runtime.service";

@Injectable()
export class MaintenanceService implements OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceService.name);
  private interval: NodeJS.Timeout | undefined;

  constructor(
    private readonly beacon: BeaconService,
    private readonly matching: MatchingRuntimeService,
    private readonly privacy: PrivacyRuntimeService
  ) {}

  start(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      void this.runSweep();
    }, 5 * 60 * 1000);

    this.logger.log("In-process maintenance scheduler started");
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private async runSweep(): Promise<void> {
    try {
      await this.beacon.expireStaleSessions();
      await this.matching.sweep();
      await this.privacy.cleanupRetention();
      this.logger.debug("maintenance sweep tick");
    } catch (error) {
      this.logger.error("maintenance sweep failed", error instanceof Error ? error.stack : undefined);
    }
  }
}

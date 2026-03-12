import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";

@Injectable()
export class MaintenanceService implements OnModuleDestroy {
  private readonly logger = new Logger(MaintenanceService.name);
  private interval: NodeJS.Timeout | undefined;

  start(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      this.logger.debug("maintenance sweep tick");
    }, 5 * 60 * 1000);

    this.logger.log("In-process maintenance scheduler started");
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}

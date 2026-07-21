import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { APARTMENT_STATUS_SWEEP_QUEUE } from './apartment-status-sweep.constants';
import { ApartmentStatusSweepService } from './apartment-status-sweep.service';

/**
 * Consumes the daily repeatable job and sweeps every org. The manual
 * `POST /apartments/status-sweep` endpoint calls
 * {@link ApartmentStatusSweepService.sweepForOrg} directly (single-org,
 * synchronous response) — this processor is only reached by the scheduled job.
 */
@Processor(APARTMENT_STATUS_SWEEP_QUEUE)
export class ApartmentStatusSweepProcessor extends WorkerHost {
  private readonly logger = new Logger(ApartmentStatusSweepProcessor.name);

  constructor(
    private readonly apartmentStatusSweep: ApartmentStatusSweepService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Starting apartment-status sweep (job ${job.id})`);
    await this.apartmentStatusSweep.sweepAll();
  }
}

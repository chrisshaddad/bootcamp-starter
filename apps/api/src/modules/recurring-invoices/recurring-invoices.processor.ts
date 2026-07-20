import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RECURRING_INVOICES_QUEUE } from './recurring-invoices.constants';
import { RecurringInvoicesService } from './recurring-invoices.service';

/**
 * Consumes the daily repeatable job and runs generation across every org.
 * The manual `POST /recurring-invoices/run` endpoint calls
 * {@link RecurringInvoicesService.runForOrg} directly (single-org, synchronous
 * response) — this processor is only reached by the scheduled job.
 */
@Processor(RECURRING_INVOICES_QUEUE)
export class RecurringInvoicesProcessor extends WorkerHost {
  private readonly logger = new Logger(RecurringInvoicesProcessor.name);

  constructor(private readonly recurringInvoices: RecurringInvoicesService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Starting recurring-invoice run (job ${job.id})`);
    await this.recurringInvoices.runAll();
  }
}

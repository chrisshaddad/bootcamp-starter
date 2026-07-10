import { Injectable } from '@nestjs/common';
import { LeaseStatus } from '@repo/contracts';

export type LeaseStatusInput = {
  status: LeaseStatus;
  endDate: Date;
};

@Injectable()
export class LeaseStatusService {
  /**
   * The stored status moves draft -> active -> terminated; 'expired' is never
   * written, only derived here when an active lease's endDate has passed.
   */
  deriveEffectiveStatus(lease: LeaseStatusInput, now: Date): LeaseStatus {
    if (lease.status === 'active' && lease.endDate < now) {
      return 'expired';
    }
    return lease.status;
  }

  isEffectivelyActive(lease: LeaseStatusInput, now: Date): boolean {
    return this.deriveEffectiveStatus(lease, now) === 'active';
  }
}

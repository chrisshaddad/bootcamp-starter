import { Prisma } from '@repo/db';
import { LeaseResponse } from '@repo/contracts';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';

export type LeaseRow = {
  id: string;
  orgId: string;
  buildingId: string;
  floorId: string;
  apartmentId: string;
  renterId: string;
  startDate: Date;
  endDate: Date;
  rentAmount: Prisma.Decimal;
  depositAmount: Prisma.Decimal;
  status: string;
  renewalTerms: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Shared by LeasesService and RentersService (renter lease-history/status). */
export function formatLease(
  lease: LeaseRow,
  now: Date,
  leaseStatus: LeaseStatusService,
): LeaseResponse {
  return {
    id: lease.id,
    orgId: lease.orgId,
    buildingId: lease.buildingId,
    floorId: lease.floorId,
    apartmentId: lease.apartmentId,
    renterId: lease.renterId,
    startDate: lease.startDate.toISOString(),
    endDate: lease.endDate.toISOString(),
    rentAmount: lease.rentAmount.toString(),
    depositAmount: lease.depositAmount.toString(),
    status: lease.status as LeaseResponse['status'],
    effectiveStatus: leaseStatus.deriveEffectiveStatus(
      {
        status: lease.status as LeaseResponse['status'],
        endDate: lease.endDate,
      },
      now,
    ),
    renewalTerms: lease.renewalTerms,
    notes: lease.notes,
    createdAt: lease.createdAt.toISOString(),
    updatedAt: lease.updatedAt.toISOString(),
  };
}

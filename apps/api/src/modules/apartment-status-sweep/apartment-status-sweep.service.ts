import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';
import { ApartmentStatusSweepResponse } from '@repo/contracts';

/**
 * F4.2: leases only sync the apartment status at create/update/renew time —
 * nothing continuously re-checks it, so an apartment left `occupied` by a
 * lease that has since expired (or was terminated without a replacement)
 * stays stuck `occupied` forever. This sweep finds `occupied` apartments with
 * no effectively-active lease and reverts them to `vacant`.
 *
 * Only `occupied` apartments are ever touched: `maintenance` and
 * `unavailable` apartments are excluded by the query itself (status ===
 * 'occupied'), so an apartment with an open work order — which
 * WorkOrderApartmentStatusService keeps at `maintenance` — is never
 * considered here, let alone reverted.
 */
@Injectable()
export class ApartmentStatusSweepService {
  private readonly logger = new Logger(ApartmentStatusSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaseStatus: LeaseStatusService,
  ) {}

  /**
   * Pure, idempotent core: revert every `occupied` apartment (optionally
   * scoped to `orgId`) that has no effectively-active lease as of `asOf`.
   */
  private async sweep(
    orgId: string | undefined,
    asOf: Date,
  ): Promise<ApartmentStatusSweepResponse> {
    const apartments = await this.prisma.apartment.findMany({
      where: { ...(orgId && { orgId }), status: 'occupied' },
      select: {
        id: true,
        leases: { select: { status: true, endDate: true } },
      },
    });

    let reverted = 0;
    for (const apartment of apartments) {
      const hasActiveLease = apartment.leases.some((lease) =>
        this.leaseStatus.isEffectivelyActive(
          { status: lease.status, endDate: lease.endDate },
          asOf,
        ),
      );
      if (!hasActiveLease) {
        await this.prisma.apartment.update({
          where: { id: apartment.id },
          data: { status: 'vacant' },
        });
        reverted++;
      }
    }

    return { reverted, considered: apartments.length };
  }

  /** Sweep a single org — the manual `POST /apartments/status-sweep` trigger. */
  async sweepForOrg(
    orgId: string,
    asOf: Date = new Date(),
  ): Promise<ApartmentStatusSweepResponse> {
    return this.sweep(orgId, asOf);
  }

  /** Sweep every org — the daily scheduler's entry point. */
  async sweepAll(asOf: Date = new Date()): Promise<ApartmentStatusSweepResponse> {
    const result = await this.sweep(undefined, asOf);
    this.logger.log(
      `Apartment status sweep: reverted=${result.reverted} considered=${result.considered}`,
    );
    return result;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { RenterResponse } from '@repo/contracts';
import { CreateRenterDto } from './dto/create-renter.dto';
import { UpdateRenterDto } from './dto/update-renter.dto';

@Injectable()
export class RentersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  // ── Format helpers ────────────────────────────────────────────────────────

  private formatRenter(renter: {
    id: string;
    orgId: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): RenterResponse {
    return {
      id: renter.id,
      orgId: renter.orgId,
      fullName: renter.fullName,
      email: renter.email,
      phone: renter.phone,
      emergencyContactName: renter.emergencyContactName,
      emergencyContactPhone: renter.emergencyContactPhone,
      notes: renter.notes,
      // The Lease table doesn't exist yet; real Current/Former derivation is
      // wired in by issues/002-leases-crud.md via LeaseStatusService.
      effectiveStatus: 'none',
      createdAt: renter.createdAt.toISOString(),
      updatedAt: renter.updatedAt.toISOString(),
    };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(orgId: string): Promise<{ data: RenterResponse[] }> {
    const renters = await this.prisma.renter.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    });

    return { data: renters.map((r) => this.formatRenter(r)) };
  }

  async findOne(
    orgId: string,
    renterId: string,
  ): Promise<{ data: RenterResponse }> {
    const renter = await this.prisma.renter.findFirst({
      where: { id: renterId, orgId },
    });
    if (!renter) throw new NotFoundException('Renter not found.');

    return { data: this.formatRenter(renter) };
  }

  async create(
    orgId: string,
    actorId: string,
    dto: CreateRenterDto,
  ): Promise<{ data: RenterResponse }> {
    const renter = await this.prisma.renter.create({
      data: {
        orgId,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        notes: dto.notes,
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'renter.created',
      targetType: 'Renter',
      targetId: renter.id,
      metadata: { fullName: renter.fullName },
    });

    return { data: this.formatRenter(renter) };
  }

  async update(
    orgId: string,
    actorId: string,
    renterId: string,
    dto: UpdateRenterDto,
  ): Promise<{ data: RenterResponse }> {
    const existing = await this.prisma.renter.findFirst({
      where: { id: renterId, orgId },
    });
    if (!existing) throw new NotFoundException('Renter not found.');

    const renter = await this.prisma.renter.update({
      where: { id: renterId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.emergencyContactName !== undefined && {
          emergencyContactName: dto.emergencyContactName,
        }),
        ...(dto.emergencyContactPhone !== undefined && {
          emergencyContactPhone: dto.emergencyContactPhone,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'renter.updated',
      targetType: 'Renter',
      targetId: renterId,
      metadata: { changes: dto },
    });

    return { data: this.formatRenter(renter) };
  }

  async remove(
    orgId: string,
    actorId: string,
    renterId: string,
  ): Promise<{ data: { id: string } }> {
    const existing = await this.prisma.renter.findFirst({
      where: { id: renterId, orgId },
    });
    if (!existing) throw new NotFoundException('Renter not found.');

    await this.prisma.renter.delete({ where: { id: renterId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'renter.deleted',
      targetType: 'Renter',
      targetId: renterId,
      metadata: { fullName: existing.fullName },
    });

    return { data: { id: renterId } };
  }
}

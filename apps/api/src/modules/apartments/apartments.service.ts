import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { Role } from '@/common/enums';
import { ApartmentResponse } from '@repo/contracts';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

@Injectable()
export class ApartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly buildingAccess: BuildingAccessService,
  ) {}

  // ── Format helpers ────────────────────────────────────────────────────────

  private formatApartment(apartment: {
    id: string;
    orgId: string;
    buildingId: string;
    floorId: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: Prisma.Decimal;
    sqft: number | null;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ApartmentResponse {
    return {
      id: apartment.id,
      orgId: apartment.orgId,
      buildingId: apartment.buildingId,
      floorId: apartment.floorId,
      unitNumber: apartment.unitNumber,
      bedrooms: apartment.bedrooms,
      bathrooms: apartment.bathrooms.toString(),
      sqft: apartment.sqft,
      status: apartment.status as ApartmentResponse['status'],
      notes: apartment.notes,
      createdAt: apartment.createdAt.toISOString(),
      updatedAt: apartment.updatedAt.toISOString(),
    };
  }

  private async assertFloorInBuilding(
    orgId: string,
    buildingId: string,
    floorId: string,
  ): Promise<void> {
    const floor = await this.prisma.floor.findFirst({
      where: { id: floorId, orgId, buildingId },
      select: { id: true },
    });
    if (!floor) throw new NotFoundException('Floor not found.');
  }

  private async assertUnitNumberAvailable(
    buildingId: string,
    unitNumber: string,
    excludeApartmentId?: string,
  ): Promise<void> {
    const existing = await this.prisma.apartment.findFirst({
      where: {
        buildingId,
        unitNumber,
        ...(excludeApartmentId && { id: { not: excludeApartmentId } }),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `Unit "${unitNumber}" already exists in this building.`,
      );
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
    buildingId: string,
    floorId: string,
  ): Promise<{ data: ApartmentResponse[] }> {
    await this.assertFloorInBuilding(orgId, buildingId, floorId);
    await this.buildingAccess.assertBuildingAccess(
      orgId,
      callerId,
      callerRole,
      buildingId,
    );

    const apartments = await this.prisma.apartment.findMany({
      where: { orgId, buildingId, floorId },
      orderBy: { unitNumber: 'asc' },
    });

    return { data: apartments.map((a) => this.formatApartment(a)) };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    buildingId: string,
    floorId: string,
    apartmentId: string,
  ): Promise<{ data: ApartmentResponse }> {
    const apartment = await this.prisma.apartment.findFirst({
      where: { id: apartmentId, orgId, buildingId, floorId },
    });
    if (!apartment) throw new NotFoundException('Apartment not found.');

    await this.buildingAccess.assertBuildingAccess(
      orgId,
      callerId,
      callerRole,
      buildingId,
    );

    return { data: this.formatApartment(apartment) };
  }

  async create(
    orgId: string,
    actorId: string,
    buildingId: string,
    floorId: string,
    dto: CreateApartmentDto,
  ): Promise<{ data: ApartmentResponse }> {
    await this.assertFloorInBuilding(orgId, buildingId, floorId);
    await this.assertUnitNumberAvailable(buildingId, dto.unitNumber);

    const apartment = await this.prisma.apartment.create({
      data: {
        orgId,
        buildingId,
        floorId,
        unitNumber: dto.unitNumber,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        sqft: dto.sqft,
        notes: dto.notes,
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'apartment.created',
      targetType: 'Apartment',
      targetId: apartment.id,
      metadata: { unitNumber: apartment.unitNumber, buildingId, floorId },
    });

    return { data: this.formatApartment(apartment) };
  }

  async update(
    orgId: string,
    actorId: string,
    buildingId: string,
    floorId: string,
    apartmentId: string,
    dto: UpdateApartmentDto,
  ): Promise<{ data: ApartmentResponse }> {
    const existing = await this.prisma.apartment.findFirst({
      where: { id: apartmentId, orgId, buildingId, floorId },
    });
    if (!existing) throw new NotFoundException('Apartment not found.');

    if (
      dto.unitNumber !== undefined &&
      dto.unitNumber !== existing.unitNumber
    ) {
      await this.assertUnitNumberAvailable(
        buildingId,
        dto.unitNumber,
        apartmentId,
      );
    }

    const apartment = await this.prisma.apartment.update({
      where: { id: apartmentId },
      data: {
        ...(dto.unitNumber !== undefined && { unitNumber: dto.unitNumber }),
        ...(dto.bedrooms !== undefined && { bedrooms: dto.bedrooms }),
        ...(dto.bathrooms !== undefined && { bathrooms: dto.bathrooms }),
        ...(dto.sqft !== undefined && { sqft: dto.sqft }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'apartment.updated',
      targetType: 'Apartment',
      targetId: apartmentId,
      metadata: { changes: dto },
    });

    return { data: this.formatApartment(apartment) };
  }

  async remove(
    orgId: string,
    actorId: string,
    buildingId: string,
    floorId: string,
    apartmentId: string,
  ): Promise<{ data: { id: string } }> {
    const existing = await this.prisma.apartment.findFirst({
      where: { id: apartmentId, orgId, buildingId, floorId },
    });
    if (!existing) throw new NotFoundException('Apartment not found.');

    await this.prisma.apartment.delete({ where: { id: apartmentId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'apartment.deleted',
      targetType: 'Apartment',
      targetId: apartmentId,
      metadata: { unitNumber: existing.unitNumber },
    });

    return { data: { id: apartmentId } };
  }
}

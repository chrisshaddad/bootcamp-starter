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
import { FloorResponse } from '@repo/contracts';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly buildingAccess: BuildingAccessService,
  ) {}

  // ── Format helpers ────────────────────────────────────────────────────────

  private formatFloor(floor: {
    id: string;
    orgId: string;
    buildingId: string;
    name: string;
    order: number;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): FloorResponse {
    return {
      id: floor.id,
      orgId: floor.orgId,
      buildingId: floor.buildingId,
      name: floor.name,
      order: floor.order,
      notes: floor.notes,
      createdAt: floor.createdAt.toISOString(),
      updatedAt: floor.updatedAt.toISOString(),
    };
  }

  private async assertBuildingInOrg(
    orgId: string,
    buildingId: string,
  ): Promise<void> {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, orgId },
      select: { id: true },
    });
    if (!building) throw new NotFoundException('Building not found.');
  }

  private async assertNameAvailable(
    buildingId: string,
    name: string,
    excludeFloorId?: string,
  ): Promise<void> {
    const existing = await this.prisma.floor.findFirst({
      where: {
        buildingId,
        name,
        ...(excludeFloorId && { id: { not: excludeFloorId } }),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `A floor named "${name}" already exists in this building.`,
      );
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
    buildingId: string,
  ): Promise<{ data: FloorResponse[] }> {
    await this.assertBuildingInOrg(orgId, buildingId);
    await this.buildingAccess.assertBuildingAccess(
      orgId,
      callerId,
      callerRole,
      buildingId,
    );

    const floors = await this.prisma.floor.findMany({
      where: { orgId, buildingId },
      orderBy: { order: 'asc' },
    });

    return { data: floors.map((f) => this.formatFloor(f)) };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    buildingId: string,
    floorId: string,
  ): Promise<{ data: FloorResponse }> {
    const floor = await this.prisma.floor.findFirst({
      where: { id: floorId, orgId, buildingId },
    });
    if (!floor) throw new NotFoundException('Floor not found.');

    await this.buildingAccess.assertBuildingAccess(
      orgId,
      callerId,
      callerRole,
      buildingId,
    );

    return { data: this.formatFloor(floor) };
  }

  async create(
    orgId: string,
    actorId: string,
    buildingId: string,
    dto: CreateFloorDto,
  ): Promise<{ data: FloorResponse }> {
    await this.assertBuildingInOrg(orgId, buildingId);
    await this.assertNameAvailable(buildingId, dto.name);

    const maxOrder = await this.prisma.floor.aggregate({
      where: { buildingId },
      _max: { order: true },
    });

    const floor = await this.prisma.floor.create({
      data: {
        orgId,
        buildingId,
        name: dto.name,
        notes: dto.notes,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'floor.created',
      targetType: 'Floor',
      targetId: floor.id,
      metadata: { name: floor.name, buildingId },
    });

    return { data: this.formatFloor(floor) };
  }

  async update(
    orgId: string,
    actorId: string,
    buildingId: string,
    floorId: string,
    dto: UpdateFloorDto,
  ): Promise<{ data: FloorResponse }> {
    const existing = await this.prisma.floor.findFirst({
      where: { id: floorId, orgId, buildingId },
    });
    if (!existing) throw new NotFoundException('Floor not found.');

    if (dto.name !== undefined && dto.name !== existing.name) {
      await this.assertNameAvailable(buildingId, dto.name, floorId);
    }

    const floor = await this.prisma.floor.update({
      where: { id: floorId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'floor.updated',
      targetType: 'Floor',
      targetId: floorId,
      metadata: { changes: dto },
    });

    return { data: this.formatFloor(floor) };
  }

  async remove(
    orgId: string,
    actorId: string,
    buildingId: string,
    floorId: string,
  ): Promise<{ data: { id: string } }> {
    const existing = await this.prisma.floor.findFirst({
      where: { id: floorId, orgId, buildingId },
    });
    if (!existing) throw new NotFoundException('Floor not found.');

    await this.prisma.floor.delete({ where: { id: floorId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'floor.deleted',
      targetType: 'Floor',
      targetId: floorId,
      metadata: { name: existing.name },
    });

    return { data: { id: floorId } };
  }

  /**
   * Creates the building's default "Ground Floor" using the caller's
   * transaction client, so it commits/rolls back atomically with the
   * Building row it belongs to.
   */
  async createDefaultFloor(
    tx: Prisma.TransactionClient,
    orgId: string,
    buildingId: string,
  ) {
    return tx.floor.create({
      data: {
        orgId,
        buildingId,
        name: 'Ground Floor',
        order: 0,
      },
    });
  }
}

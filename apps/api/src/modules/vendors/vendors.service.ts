import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { VendorResponse, VendorServiceType } from '@repo/contracts';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

type VendorRow = {
  id: string;
  orgId: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  servicesOffered: string[];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
  ) {}

  // ── Format helpers ────────────────────────────────────────────────────────

  private formatVendor(vendor: VendorRow): VendorResponse {
    return {
      id: vendor.id,
      orgId: vendor.orgId,
      companyName: vendor.companyName,
      contactName: vendor.contactName,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      servicesOffered: vendor.servicesOffered as VendorServiceType[],
      notes: vendor.notes,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    };
  }

  // ── CRUD (read) ───────────────────────────────────────────────────────────

  async findAll(orgId: string): Promise<{ data: VendorResponse[] }> {
    const vendors = await this.prisma.vendor.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    });

    return { data: vendors.map((v) => this.formatVendor(v)) };
  }

  async findOne(
    orgId: string,
    vendorId: string,
  ): Promise<{ data: VendorResponse }> {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, orgId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found.');

    return { data: this.formatVendor(vendor) };
  }

  async create(
    orgId: string,
    actorId: string,
    dto: CreateVendorDto,
  ): Promise<{ data: VendorResponse }> {
    const vendor = await this.prisma.vendor.create({
      data: {
        orgId,
        companyName: dto.companyName,
        contactName: dto.contactName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        servicesOffered: dto.servicesOffered,
        notes: dto.notes,
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'vendor.created',
      targetType: 'Vendor',
      targetId: vendor.id,
      metadata: { companyName: vendor.companyName },
    });

    return { data: this.formatVendor(vendor) };
  }

  async update(
    orgId: string,
    actorId: string,
    vendorId: string,
    dto: UpdateVendorDto,
  ): Promise<{ data: VendorResponse }> {
    const existing = await this.prisma.vendor.findFirst({
      where: { id: vendorId, orgId },
    });
    if (!existing) throw new NotFoundException('Vendor not found.');

    const vendor = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.servicesOffered !== undefined && {
          servicesOffered: dto.servicesOffered,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'vendor.updated',
      targetType: 'Vendor',
      targetId: vendorId,
      metadata: { changes: Object.keys(dto) },
    });

    return { data: this.formatVendor(vendor) };
  }

  async remove(
    orgId: string,
    actorId: string,
    vendorId: string,
  ): Promise<{ data: { id: string } }> {
    const existing = await this.prisma.vendor.findFirst({
      where: { id: vendorId, orgId },
    });
    if (!existing) throw new NotFoundException('Vendor not found.');

    const workOrderCount = await this.prisma.workOrder.count({
      where: { vendorId },
    });
    if (workOrderCount > 0) {
      throw new ConflictException(
        'Cannot delete a vendor that is referenced by a work order.',
      );
    }

    await this.prisma.vendor.delete({ where: { id: vendorId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'vendor.deleted',
      targetType: 'Vendor',
      targetId: vendorId,
      metadata: { companyName: existing.companyName },
    });

    return { data: { id: vendorId } };
  }
}

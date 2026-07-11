import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { VendorResponse, VendorServiceType } from '@repo/contracts';

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
  constructor(private readonly prisma: PrismaService) {}

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
}

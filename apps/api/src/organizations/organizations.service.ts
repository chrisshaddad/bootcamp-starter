import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  OrganizationListResponse,
  OrganizationDetailResponse,
} from '@repo/contracts';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stubs returning empty to satisfy TypeScript and Contracts
   * while allowing you to deprecate/remove the module later.
   */
  async findAll(options: any): Promise<OrganizationListResponse> {
    return {
      organizations: [],
      total: 0,
    } as unknown as OrganizationListResponse;
  }

  async findOne(id: string): Promise<OrganizationDetailResponse> {
    throw new NotFoundException(`Organization with ID ${id} not found`);
  }

  async approve(
    id: string,
    approvedById: string,
  ): Promise<OrganizationDetailResponse> {
    throw new NotFoundException(`Organization with ID ${id} not found`);
  }

  async reject(id: string): Promise<OrganizationDetailResponse> {
    throw new NotFoundException(`Organization with ID ${id} not found`);
  }
}

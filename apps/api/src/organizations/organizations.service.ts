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
   * Stubs returning explicit failure for deprecated endpoints.
   */
  findAll(_options: any): Promise<OrganizationListResponse> {
    throw new NotFoundException(
      'The organizations directory has been deprecated.',
    );
  }

  findOne(id: string): Promise<OrganizationDetailResponse> {
    throw new NotFoundException(`Organization with ID ${id} not found`);
  }

  approve(
    id: string,
    _approvedById: string,
  ): Promise<OrganizationDetailResponse> {
    throw new NotFoundException(`Organization with ID ${id} not found`);
  }

  reject(id: string): Promise<OrganizationDetailResponse> {
    throw new NotFoundException(`Organization with ID ${id} not found`);
  }
}
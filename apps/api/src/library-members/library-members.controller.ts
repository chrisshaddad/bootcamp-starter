import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { LibraryMembersService } from './library-members.service';
import { Roles, OrganizationId } from '../auth/decorators';
import {
  libraryMemberCreateRequestSchema,
  libraryMemberUpdateRequestSchema,
  libraryMemberStatusSchema,
  libraryMembershipTypeSchema,
  type LibraryMemberCreateRequest,
  type LibraryMemberUpdateRequest,
  type LibraryMemberResponse,
  type LibraryMemberListResponse,
  type LibraryMemberStatus,
  type LibraryMembershipType,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('library-members')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class LibraryMembersController {
  constructor(private readonly libraryMembersService: LibraryMembersService) {}

  @Get()
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('membershipStatus') membershipStatus?: string,
    @Query('membershipType') membershipType?: string,
  ): Promise<LibraryMemberListResponse> {
    return this.libraryMembersService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      membershipStatus: membershipStatus
        ? this.parseStatus(membershipStatus)
        : undefined,
      membershipType: membershipType
        ? this.parseType(membershipType)
        : undefined,
    });
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<LibraryMemberResponse> {
    return this.libraryMembersService.findOne(organizationId, id);
  }

  @Post()
  async create(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(libraryMemberCreateRequestSchema))
    body: LibraryMemberCreateRequest,
  ): Promise<LibraryMemberResponse> {
    return this.libraryMembersService.create(organizationId, body);
  }

  @Patch(':id')
  async update(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(libraryMemberUpdateRequestSchema))
    body: LibraryMemberUpdateRequest,
  ): Promise<LibraryMemberResponse> {
    return this.libraryMembersService.update(organizationId, id, body);
  }

  private parseStatus(status: string): LibraryMemberStatus {
    const result = libraryMemberStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid membershipStatus: ${status}`);
    }

    return result.data;
  }

  private parseType(type: string): LibraryMembershipType {
    const result = libraryMembershipTypeSchema.safeParse(type);

    if (!result.success) {
      throw new BadRequestException(`Invalid membershipType: ${type}`);
    }

    return result.data;
  }
}

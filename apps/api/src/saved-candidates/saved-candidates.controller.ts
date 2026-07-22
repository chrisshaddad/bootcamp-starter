// apps/api/src/saved-candidates/saved-candidates.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SavedCandidatesService } from './saved-candidates.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccountType, CandidateStatus } from '@repo/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  savedCandidateCreateRequestSchema,
  savedCandidateUpdateRequestSchema,
  type SavedCandidateCreateRequest,
  type SavedCandidateUpdateRequest,
} from '@repo/contracts';

type SavedCandidateRecord = {
  id: string;
  candidateId: string;
  savedByUserId: string;
  status: CandidateStatus;
  note: string | null;
  createdAt: Date;
  candidate: {
    id: string;
    developerProfile: {
      publicSlug: string;
      displayName: string;
      headline: string | null;
      profilePictureUrl: string | null;
    } | null;
  };
};

const mapToResponse = (record: SavedCandidateRecord) => ({
  id: record.id,
  candidateId: record.candidateId,
  savedByUserId: record.savedByUserId,
  status: record.status,
  note: record.note,
  createdAt: record.createdAt.toISOString(),
  candidate: {
    id: record.candidate.id,
    publicSlug: record.candidate.developerProfile?.publicSlug ?? '',
    displayName: record.candidate.developerProfile?.displayName ?? 'Unknown',
    headline: record.candidate.developerProfile?.headline ?? null,
    profilePictureUrl:
      record.candidate.developerProfile?.profilePictureUrl ?? null,
  },
});

@ApiTags('saved-candidates')
@ApiCookieAuth('session')
@Controller('saved-candidates')
@Roles(AccountType.HIRING)
export class SavedCandidatesController {
  constructor(private readonly service: SavedCandidatesService) {}

  @Post()
  async saveCandidate(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(savedCandidateCreateRequestSchema))
    body: SavedCandidateCreateRequest,
  ) {
    const saved = await this.service.saveCandidate(
      userId,
      body.candidateId,
      body.note,
    );
    return mapToResponse(saved);
  }

  @Patch(':candidateId')
  async updateCandidate(
    @CurrentUser('id') userId: string,
    @Param('candidateId') candidateId: string,
    @Body(new ZodValidationPipe(savedCandidateUpdateRequestSchema))
    body: SavedCandidateUpdateRequest,
  ) {
    const updated = await this.service.updateCandidate(
      userId,
      candidateId,
      body.status,
      body.note,
    );
    return mapToResponse(updated);
  }

  @Delete(':candidateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsaveCandidate(
    @CurrentUser('id') userId: string,
    @Param('candidateId') candidateId: string,
  ) {
    await this.service.unsaveCandidate(userId, candidateId);
  }

  @Get()
  async listSavedCandidates(@CurrentUser('id') userId: string) {
    const list = await this.service.listSavedCandidates(userId);
    return { data: list.map(mapToResponse) };
  }
}

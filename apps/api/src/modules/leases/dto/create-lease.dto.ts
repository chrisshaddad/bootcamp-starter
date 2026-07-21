import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaseStatus } from '@repo/db';

export class CreateLeaseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  renterId: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rentAmount: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount: number;

  @ApiPropertyOptional({
    enum: LeaseStatus,
    description: 'Defaults to active when not provided',
  })
  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  renewalTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description:
      "F4.3 (decision D3): a NEW active lease may not silently start in the past. " +
      'Set this to explicitly record an already-existing lease with a back-dated ' +
      'start; without it, a past start on an active lease is rejected (400).',
  })
  @IsOptional()
  @IsBoolean()
  recordExisting?: boolean;
}

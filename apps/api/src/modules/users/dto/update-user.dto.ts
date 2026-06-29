import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@/common/enums';

/** Roles that can be assigned/changed. org_admin and tenant are forbidden. */
const UPDATABLE_ROLES = [
  Role.SUPERVISOR,
  Role.FINANCE,
  Role.MAINTENANCE,
] as const;

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: UPDATABLE_ROLES })
  @IsOptional()
  @IsEnum(UPDATABLE_ROLES, {
    message: 'role must be one of: supervisor, finance, maintenance',
  })
  role?: (typeof UPDATABLE_ROLES)[number];

  @ApiPropertyOptional({
    type: [String],
    description: 'Replace building assignments for this user',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  buildingIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

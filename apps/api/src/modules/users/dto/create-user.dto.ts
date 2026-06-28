import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@/common/enums';

/** Roles that org_admin may create for staff. org_admin and tenant are forbidden. */
const CREATABLE_ROLES = [
  Role.SUPERVISOR,
  Role.FINANCE,
  Role.MAINTENANCE,
] as const;

export type CreatableRole = (typeof CREATABLE_ROLES)[number];

export class CreateUserDto {
  @ApiProperty({ description: 'Login username (unique in the realm)' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Initial password — set as permanent, no reset required',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Optional email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    enum: CREATABLE_ROLES,
    description: 'supervisor | finance | maintenance',
  })
  @IsEnum(CREATABLE_ROLES, {
    message: 'role must be one of: supervisor, finance, maintenance',
  })
  role: CreatableRole;

  @ApiPropertyOptional({
    type: [String],
    description: 'Building IDs to assign (supervisor/maintenance only)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  buildingIds?: string[];
}

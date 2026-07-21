import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortalLoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}

export class CreateRenterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description:
      "Keycloak `sub` of the tenant user to link, enabling their self-service portal. Pass null to unlink.",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  renterUserId?: string | null;

  @ApiPropertyOptional({
    description:
      'When present, the API mints a Keycloak tenant login for this renter and links it (sets renterUserId to the new sub). Admin-provisioned only — no self-registration. If both portalLogin and renterUserId are provided, portalLogin wins.',
    type: PortalLoginDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PortalLoginDto)
  portalLogin?: PortalLoginDto;
}

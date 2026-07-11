import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorServiceType } from '@repo/db';

export class CreateVendorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string;

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
  address?: string;

  @ApiPropertyOptional({ enum: VendorServiceType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(VendorServiceType, { each: true })
  servicesOffered?: VendorServiceType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

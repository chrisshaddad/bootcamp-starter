import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApartmentStatus } from '@repo/db';

export class CreateApartmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  unitNumber: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  bedrooms: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  bathrooms: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sqft?: number;

  @ApiPropertyOptional({
    enum: ApartmentStatus,
    description: 'Defaults to vacant when not provided',
  })
  @IsOptional()
  @IsEnum(ApartmentStatus)
  status?: ApartmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

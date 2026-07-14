import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceRequestPriority, MaintenanceRequestStatus } from '@repo/db';

export class CreateMaintenanceRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  buildingId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  apartmentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  renterId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: MaintenanceRequestStatus,
    description: 'Defaults to open when not provided',
  })
  @IsOptional()
  @IsEnum(MaintenanceRequestStatus)
  status?: MaintenanceRequestStatus;

  @ApiPropertyOptional({
    enum: MaintenanceRequestPriority,
    description: 'Defaults to medium when not provided',
  })
  @IsOptional()
  @IsEnum(MaintenanceRequestPriority)
  priority?: MaintenanceRequestPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

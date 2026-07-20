import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceRequestPriority } from '@repo/db';

/**
 * A tenant opening a maintenance request for their OWN apartment. Unlike the
 * staff-facing CreateMaintenanceRequestDto, this carries no buildingId /
 * apartmentId / renterId: those are derived server-side from the caller's
 * active lease so a tenant can never target another unit. Status is forced to
 * 'open'.
 */
export class CreateTenantMaintenanceRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: MaintenanceRequestPriority,
    description: 'Defaults to medium when not provided',
  })
  @IsOptional()
  @IsEnum(MaintenanceRequestPriority)
  priority?: MaintenanceRequestPriority;
}

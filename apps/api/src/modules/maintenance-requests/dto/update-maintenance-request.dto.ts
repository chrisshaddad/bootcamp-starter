import { PartialType } from '@nestjs/swagger';
import { CreateMaintenanceRequestDto } from './create-maintenance-request.dto';

export class UpdateMaintenanceRequestDto extends PartialType(
  CreateMaintenanceRequestDto,
) {}

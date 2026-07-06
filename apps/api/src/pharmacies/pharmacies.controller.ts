import { Controller, Get } from '@nestjs/common';
import type { PharmacyListResponse } from '@repo/contracts';
import { Roles } from '../auth/decorators';
import { PharmaciesService } from './pharmacies.service';

// Pharmacy list for the super-admin console (e.g. assigning a pharmacy user).
@Controller('pharmacies')
@Roles('SUPER_ADMIN')
export class PharmaciesController {
  constructor(private readonly pharmaciesService: PharmaciesService) {}

  @Get()
  list(): Promise<PharmacyListResponse> {
    return this.pharmaciesService.list();
  }
}

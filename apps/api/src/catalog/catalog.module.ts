import { Module } from '@nestjs/common';
import { MedicinesModule } from '../medicines/medicines.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

// PrismaService (DatabaseModule) is global. MedicinesModule is imported so the
// catalog can reuse MedicinesService (list / getById / listByIds) for browse,
// detail, and alternatives instead of forking the medicine mapping.
@Module({
  imports: [MedicinesModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}

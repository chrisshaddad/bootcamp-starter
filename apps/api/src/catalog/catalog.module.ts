import { Module } from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { AuthorsController } from './authors.controller';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';

@Module({
  providers: [AuthorsService, CategoriesService],
  controllers: [AuthorsController, CategoriesController],
})
export class CatalogModule {}

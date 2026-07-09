import { Module } from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { AuthorsController } from './authors.controller';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PublishersService } from './publishers.service';
import { PublishersController } from './publishers.controller';

@Module({
  providers: [AuthorsService, CategoriesService, PublishersService],
  controllers: [AuthorsController, CategoriesController, PublishersController],
})
export class CatalogModule {}

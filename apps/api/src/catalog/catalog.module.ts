import { Module } from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { AuthorsController } from './authors.controller';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PublishersService } from './publishers.service';
import { PublishersController } from './publishers.controller';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { BookCopiesService } from './book-copies.service';
import { BookCopiesController } from './book-copies.controller';

@Module({
  providers: [
    AuthorsService,
    CategoriesService,
    PublishersService,
    BooksService,
    BookCopiesService,
  ],
  controllers: [
    AuthorsController,
    CategoriesController,
    PublishersController,
    BooksController,
    BookCopiesController,
  ],
  exports: [BooksService, BookCopiesService, AuthorsService, CategoriesService],
})
export class CatalogModule {}

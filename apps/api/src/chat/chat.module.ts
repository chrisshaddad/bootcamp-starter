import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ChatService } from './chat.service';

@Module({
  imports: [CatalogModule], // for the injected BooksService
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}

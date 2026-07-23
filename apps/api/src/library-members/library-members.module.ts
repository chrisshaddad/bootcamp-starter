import { Module } from '@nestjs/common';
import { LibraryMembersService } from './library-members.service';
import { LibraryMembersController } from './library-members.controller';

@Module({
  providers: [LibraryMembersService],
  controllers: [LibraryMembersController],
  exports: [LibraryMembersService],
})
export class LibraryMembersModule {}

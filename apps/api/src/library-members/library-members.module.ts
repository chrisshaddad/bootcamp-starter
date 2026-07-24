import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LibraryMembersService } from './library-members.service';
import { LibraryMembersController } from './library-members.controller';

@Module({
  imports: [AuthModule],
  providers: [LibraryMembersService],
  controllers: [LibraryMembersController],
  exports: [LibraryMembersService],
})
export class LibraryMembersModule {}

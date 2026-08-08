import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { LibraryMembersService } from './library-members.service';
import { LibraryMembersController } from './library-members.controller';

@Module({
  imports: [AuthModule, MailModule],
  providers: [LibraryMembersService],
  controllers: [LibraryMembersController],
  exports: [LibraryMembersService],
})
export class LibraryMembersModule {}

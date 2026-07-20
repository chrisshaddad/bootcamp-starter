import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Provides the SMTP MailService. Imported wherever email is sent (currently the
 * notifications module). Kept as a plain feature module rather than @Global so
 * dependencies stay explicit.
 */
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}

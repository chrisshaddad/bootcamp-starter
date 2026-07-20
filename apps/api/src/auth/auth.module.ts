import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SessionService } from './session.service';
import { MailModule } from '../mail/mail.module';
import { RedisClientService } from './redis-client.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [MailModule, StorageModule],
  providers: [
    AuthService,
    SessionService,
    RedisClientService,
    {
      provide: 'REDIS_CLIENT',
      useExisting: RedisClientService,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, SessionService, 'REDIS_CLIENT'],
})
export class AuthModule {}

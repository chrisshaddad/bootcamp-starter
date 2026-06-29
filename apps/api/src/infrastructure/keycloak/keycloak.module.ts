import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { KeycloakAdminService } from './keycloak-admin.service';
import { KeycloakJwtStrategy } from './keycloak-jwt.strategy';

@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [KeycloakJwtStrategy, KeycloakAdminService],
  exports: [PassportModule, KeycloakAdminService],
})
export class KeycloakModule {}

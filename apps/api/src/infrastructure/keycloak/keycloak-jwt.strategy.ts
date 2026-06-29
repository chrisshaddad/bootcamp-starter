import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

interface KeycloakJwtPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  phone_number?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  org_id?: string;
}

@Injectable()
export class KeycloakJwtStrategy
  extends PassportStrategy(Strategy, 'jwt')
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(KeycloakJwtStrategy.name);
  private readonly issuer: string;
  private readonly jwksUri: string;
  private readonly webClientId: string;

  constructor(configService: ConfigService) {
    const issuer = configService.getOrThrow<string>('keycloak.issuer');
    const jwksUri = configService.getOrThrow<string>('keycloak.jwksUri');
    const webClientId = configService.getOrThrow<string>(
      'keycloak.webClientId',
    );

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer,
      algorithms: ['RS256'],
      jsonWebTokenOptions: { clockTolerance: 30 },
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
    });

    this.issuer = issuer;
    this.jwksUri = jwksUri;
    this.webClientId = webClientId;
  }

  async onApplicationBootstrap() {
    this.logger.log(`Keycloak JWT strategy ready. Issuer: ${this.issuer}`);
    try {
      const response = await fetch(this.jwksUri);
      if (!response.ok) {
        this.logger.error(
          `JWKS unreachable: ${this.jwksUri} → ${response.status}`,
        );
        return;
      }
      const payload = (await response.json()) as {
        keys?: Array<{ kid?: string }>;
      };
      const kids = payload.keys?.map((k) => k.kid).filter(Boolean) ?? [];
      this.logger.log(
        `Keycloak JWKS reachable (${kids.length} key${kids.length !== 1 ? 's' : ''}: ${kids.join(', ')})`,
      );
    } catch (error) {
      this.logger.error(
        `JWKS probe failed: ${this.jwksUri}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  validate(payload: KeycloakJwtPayload): AuthenticatedUser {
    // Roles are sourced from the web client's CLIENT roles
    // (resource_access[webClientId].roles); realm roles are merged in as a
    // backstop so the switch is non-breaking.
    const clientRoles =
      payload.resource_access?.[this.webClientId]?.roles ?? [];
    const realmRoles = payload.realm_access?.roles ?? [];
    const allRoleNames = [...clientRoles, ...realmRoles];

    const knownRoles = new Set<string>(Object.values(Role));
    const roles = allRoleNames.filter((r): r is Role => knownRoles.has(r));

    return {
      sub: payload.sub,
      email: payload.email,
      preferredUsername: payload.preferred_username,
      fullName: payload.name,
      phone: payload.phone_number,
      realmRoles: allRoleNames,
      roles,
      orgId: payload.org_id,
    };
  }
}

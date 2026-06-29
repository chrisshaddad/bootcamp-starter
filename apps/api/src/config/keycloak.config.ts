import { registerAs } from '@nestjs/config';

export const keycloakConfig = registerAs('keycloak', () => {
  const baseUrl = process.env.KEYCLOAK_BASE ?? '';
  const realm = process.env.KEYCLOAK_REALM ?? '';

  return {
    baseUrl,
    realm,
    issuer: process.env.KEYCLOAK_ISSUER ?? `${baseUrl}/realms/${realm}`,
    jwksUri:
      process.env.KEYCLOAK_JWKS_URI ??
      `${baseUrl}/realms/${realm}/protocol/openid-connect/certs`,
    adminClientId: process.env.KEYCLOAK_API_CLIENT_ID ?? '',
    adminClientSecret: process.env.KEYCLOAK_API_CLIENT_SECRET ?? '',
    webClientId: process.env.KEYCLOAK_WEB_CLIENT_ID ?? '',
    tokenUrl: `${baseUrl}/realms/${realm}/protocol/openid-connect/token`,
    authorizationUrl: `${baseUrl}/realms/${realm}/protocol/openid-connect/auth`,
  };
});

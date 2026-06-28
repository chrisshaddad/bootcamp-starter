import { z } from 'zod';

const serverEnvSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  API_URL: z.string().url('API_URL must be a valid URL'),
  OIDC_ISSUER: z.string().url('OIDC_ISSUER must be a valid URL'),
  OAUTH_CLIENT: z.string().min(1, 'OAUTH_CLIENT is required'),
  OAUTH_SECRET: z.string().min(1, 'OAUTH_SECRET is required'),
  KEYCLOAK_BASE: z.string().url('KEYCLOAK_BASE must be a valid URL'),
  KEYCLOAK_REALM: z.string().min(1, 'KEYCLOAK_REALM is required'),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required'),
});

function resolveOidcIssuer(): string | undefined {
  const explicit = process.env.OIDC_ISSUER?.trim();
  if (explicit) return explicit;
  const base = process.env.KEYCLOAK_BASE?.replace(/\/$/, '');
  const realm = process.env.KEYCLOAK_REALM;
  if (base && realm) return `${base}/realms/${realm}`;
  return undefined;
}

export const serverEnv = serverEnvSchema.parse({
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  API_URL: process.env.API_URL,
  OIDC_ISSUER: resolveOidcIssuer(),
  OAUTH_CLIENT: process.env.OAUTH_CLIENT,
  OAUTH_SECRET: process.env.OAUTH_SECRET,
  KEYCLOAK_BASE: process.env.KEYCLOAK_BASE,
  KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});

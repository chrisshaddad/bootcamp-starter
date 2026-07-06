import type { ApiBodyOptions } from '@nestjs/swagger';
import {
  loginRequestSchema as loginRequestContractSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema as magicLinkVerifyRequestContractSchema,
  signupRequestSchema as signupRequestContractSchema,
  updateProfileRequestSchema as updateProfileRequestContractSchema,
} from '@repo/contracts';
import { z, type ZodType } from 'zod';

type ApiBodySchema = Extract<ApiBodyOptions, { schema: unknown }>['schema'];
type ApiBodySchemaWithExample = ApiBodySchema & { example?: unknown };

function toOpenApiSchema(schema: ZodType): ApiBodySchema {
  return z.toJSONSchema(schema, { target: 'draft-7' }) as ApiBodySchema;
}

function withExample(schema: ApiBodySchema, example: unknown): ApiBodySchema {
  return {
    ...(schema as ApiBodySchemaWithExample),
    example,
  };
}

export const emailRequestSchema: ApiBodySchema = withExample(
  toOpenApiSchema(magicLinkRequestSchema),
  {
    email: 'developer@example.com',
  },
);
export const magicLinkVerifyRequestSchema: ApiBodySchema = withExample(
  toOpenApiSchema(magicLinkVerifyRequestContractSchema),
  {
    token: 'magic-link-token',
  },
);
export const loginRequestSchema: ApiBodySchema = withExample(
  toOpenApiSchema(loginRequestContractSchema),
  {
    email: 'dev.sarah@example.com',
    password: 'Password123!',
  },
);
export const signupRequestSchema: ApiBodySchema = withExample(
  toOpenApiSchema(signupRequestContractSchema),
  {
    email: 'developer@example.com',
    password: 'Password123!',
    accountType: 'DEVELOPER',
    displayName: 'Sarah Chen',
    publicSlug: 'sarah-chen',
  },
);
export const updateProfileRequestSchema: ApiBodySchema = withExample(
  toOpenApiSchema(updateProfileRequestContractSchema),
  {
    displayName: 'Sarah Chen',
    publicSlug: 'sarah-chen',
    headline: 'Full-stack developer',
    bio: 'I build SaaS apps.',
    location: 'Beirut, Lebanon',
    profilePictureUrl:
      'http://localhost:3001/uploads/profile-pictures/example.png',
    linkedinUrl: 'https://www.linkedin.com/in/sarahchen',
    personalWebsiteUrl: 'https://sarahchen.dev',
  },
);

export const profilePictureUploadSchema: ApiBodySchema = {
  type: 'object',
  required: ['file'],
  properties: {
    file: {
      type: 'string',
      format: 'binary',
    },
  },
};

import type { ApiBodyOptions } from '@nestjs/swagger';
import {
  githubRepositoryPreviewRequestSchema as githubRepositoryPreviewRequestContractSchema,
  importGithubProjectRequestSchema as importGithubProjectRequestContractSchema,
  addProjectMemberSchema as addProjectMemberRequestContractSchema,
  loginRequestSchema as loginRequestContractSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema as magicLinkVerifyRequestContractSchema,
  signupRequestSchema as signupRequestContractSchema,
  updateProfileRequestSchema as updateProfileRequestContractSchema,
} from '@repo/contracts';
import { z, type ZodType } from 'zod';

type ApiBodySchema = Extract<ApiBodyOptions, { schema: unknown }>['schema'];
type OpenApiSchemaObject = NonNullable<ApiBodySchema> & { example?: unknown };

function assertSchemaObject(
  schema: unknown,
): asserts schema is OpenApiSchemaObject {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error('Zod schema did not generate an OpenAPI schema object');
  }
}

function toOpenApiSchema(schema: ZodType): OpenApiSchemaObject {
  const openApiSchema = z.toJSONSchema(schema, { target: 'openapi-3.0' });
  assertSchemaObject(openApiSchema);
  return openApiSchema;
}

function withExample(
  schema: OpenApiSchemaObject,
  example: unknown,
): ApiBodySchema {
  return {
    ...schema,
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

// Multipart file uploads are documented manually because they are not JSON
// request bodies represented by the shared Zod contracts.
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

export const projectLogoUploadSchema: ApiBodySchema = {
  type: 'object',
  required: ['file'],
  properties: {
    file: {
      type: 'string',
      format: 'binary',
    },
  },
};

export const githubRepositoryPreviewRequestSchema: ApiBodySchema = withExample(
  toOpenApiSchema(githubRepositoryPreviewRequestContractSchema),
  {
    repositoryUrl: 'https://github.com/vercel/next.js',
  },
);

export const importGithubProjectRequestSchema: ApiBodySchema = withExample(
  toOpenApiSchema(importGithubProjectRequestContractSchema),
  {
    repositoryUrl: 'https://github.com/vercel/next.js',
    title: 'Next.js',
    shortDescription: 'The React Framework',
  },
);

export const addProjectMemberRequestSchema: ApiBodySchema = withExample(
  toOpenApiSchema(addProjectMemberRequestContractSchema),
  {
    githubUsername: 'octocat',
    role: 'CONTRIBUTOR',
    contributionRoleLabel: 'Frontend developer',
  },
);

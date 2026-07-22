import type { ApiBodyOptions } from '@nestjs/swagger';
import {
  githubRepositoryPreviewRequestSchema as githubRepositoryPreviewRequestContractSchema,
  importGithubProjectRequestSchema as importGithubProjectRequestContractSchema,
  loginRequestSchema as loginRequestContractSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema as magicLinkVerifyRequestContractSchema,
  resetPasswordRequestSchema as resetPasswordRequestContractSchema,
  signupRequestSchema as signupRequestContractSchema,
  updateProfileRequestSchema as updateProfileRequestContractSchema,
  createProjectInvitationRequestSchema as createProjectInvitationRequestContractSchema,
  projectCollaboratorSearchResponseSchema as projectCollaboratorSearchResponseContractSchema,
  projectInvitationResponseSchema as projectInvitationResponseContractSchema,
  projectInvitationListResponseSchema as projectInvitationListResponseContractSchema,
  projectInvitationPendingCountResponseSchema as projectInvitationPendingCountResponseContractSchema,
  projectsListResponseSchema as projectsListResponseContractSchema,
  projectByIdResponseSchema as projectByIdResponseContractSchema,
  updateProjectRequestSchema as updateProjectRequestContractSchema,
  developerPublicProfileResponseSchema as developerPublicProfileResponseContractSchema,
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

export function toOpenApiSchema(schema: ZodType): OpenApiSchemaObject {
  const openApiSchema = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    unrepresentable: 'any',
  });
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
export const resetPasswordRequestSchema: ApiBodySchema = withExample(
  toOpenApiSchema(resetPasswordRequestContractSchema),
  {
    token: 'password-reset-token',
    newPassword: 'NewPassword123!',
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
      'http://localhost:9000/bootcamp-media/profile-pictures/example.png',
    profilePictureOriginalUrl:
      'http://localhost:9000/bootcamp-media/profile-pictures/example-original.png',
    profilePictureCropZoom: 1.35,
    profilePictureCropX: 12,
    profilePictureCropY: -8,
    linkedinUrl: 'https://www.linkedin.com/in/sarahchen',
    personalWebsiteUrl: 'https://sarahchen.dev',
  },
);

// Multipart file uploads are documented manually because they are not JSON
// request bodies represented by the shared Zod contracts.
export const profilePictureUploadSchema: ApiBodySchema = {
  type: 'object',
  required: ['file', 'originalFile'],
  properties: {
    file: {
      type: 'string',
      format: 'binary',
    },
    originalFile: {
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

export const createProjectInvitationRequestSchema: ApiBodySchema = withExample(
  toOpenApiSchema(createProjectInvitationRequestContractSchema),
  {
    githubUsername: 'octocat',
    role: 'CONTRIBUTOR',
    contributionRoleLabel: 'Backend developer',
  },
);

export const projectCollaboratorSearchResponseSchema: ApiBodySchema =
  toOpenApiSchema(projectCollaboratorSearchResponseContractSchema);

export const projectInvitationResponseSchema: ApiBodySchema = toOpenApiSchema(
  projectInvitationResponseContractSchema,
);

export const projectInvitationListResponseSchema: ApiBodySchema =
  toOpenApiSchema(projectInvitationListResponseContractSchema);

export const projectInvitationPendingCountResponseSchema: ApiBodySchema =
  toOpenApiSchema(projectInvitationPendingCountResponseContractSchema);

export const projectsListResponseSchema: ApiBodySchema = toOpenApiSchema(
  projectsListResponseContractSchema,
);

export const projectByIdResponseSchema: ApiBodySchema = toOpenApiSchema(
  projectByIdResponseContractSchema,
);

export const updateProjectRequestSchema: ApiBodySchema = toOpenApiSchema(
  updateProjectRequestContractSchema,
);

export const developerPublicProfileResponseSchema: ApiBodySchema =
  toOpenApiSchema(developerPublicProfileResponseContractSchema);

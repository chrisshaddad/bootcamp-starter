import type { ApiBodyOptions } from '@nestjs/swagger';

type ApiBodySchema = Extract<ApiBodyOptions, { schema: unknown }>['schema'];

export const emailRequestSchema: ApiBodySchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      example: 'dev.sarah@example.com',
    },
  },
};

export const magicLinkVerifyRequestSchema: ApiBodySchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: {
      type: 'string',
      example: 'magic-link-token',
    },
  },
};

export const loginRequestSchema: ApiBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      example: 'dev.sarah@example.com',
    },
    password: {
      type: 'string',
      example: 'Password123!',
    },
  },
};

export const signupRequestSchema: ApiBodySchema = {
  oneOf: [
    {
      type: 'object',
      required: [
        'email',
        'password',
        'accountType',
        'displayName',
        'publicSlug',
      ],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'developer@example.com',
        },
        password: {
          type: 'string',
          minLength: 8,
          example: 'Password123!',
        },
        accountType: {
          type: 'string',
          enum: ['DEVELOPER'],
          example: 'DEVELOPER',
        },
        displayName: {
          type: 'string',
          example: 'Sarah Chen',
        },
        publicSlug: {
          type: 'string',
          example: 'sarah-chen',
        },
      },
    },
    {
      type: 'object',
      required: [
        'email',
        'password',
        'accountType',
        'organizationName',
        'organizationType',
      ],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'hiring@example.com',
        },
        password: {
          type: 'string',
          minLength: 8,
          example: 'Password123!',
        },
        accountType: {
          type: 'string',
          enum: ['HIRING'],
          example: 'HIRING',
        },
        organizationName: {
          type: 'string',
          example: 'Acme Inc.',
        },
        organizationType: {
          type: 'string',
          enum: ['COMPANY', 'AGENCY', 'INDIVIDUAL', 'FREELANCE_CLIENT'],
          example: 'COMPANY',
        },
      },
    },
  ],
};

export const updateProfileRequestSchema: ApiBodySchema = {
  type: 'object',
  properties: {
    displayName: { type: 'string', example: 'Sarah Chen' },
    publicSlug: { type: 'string', example: 'sarah-chen' },
    headline: {
      type: 'string',
      nullable: true,
      example: 'Full-stack developer',
    },
    bio: { type: 'string', nullable: true, example: 'I build SaaS apps.' },
    location: { type: 'string', nullable: true, example: 'Beirut, Lebanon' },
    profilePictureUrl: {
      type: 'string',
      nullable: true,
      example: 'http://localhost:3001/uploads/profile-pictures/example.png',
    },
    linkedinUrl: {
      type: 'string',
      nullable: true,
      example: 'https://www.linkedin.com/in/sarahchen',
    },
    personalWebsiteUrl: {
      type: 'string',
      nullable: true,
      example: 'https://sarahchen.dev',
    },
    organizationName: { type: 'string', example: 'Acme Inc.' },
    organizationType: {
      type: 'string',
      enum: ['COMPANY', 'AGENCY', 'INDIVIDUAL', 'FREELANCE_CLIENT'],
      example: 'COMPANY',
    },
    jobTitle: { type: 'string', nullable: true, example: 'CTO' },
    organizationWebsiteUrl: {
      type: 'string',
      nullable: true,
      example: 'https://acme.example',
    },
  },
};

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

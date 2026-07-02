import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  FRONTEND_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  KEYCLOAK_BASE: Joi.string().uri().required(),
  KEYCLOAK_REALM: Joi.string().required(),
  KEYCLOAK_ISSUER: Joi.string().uri().required(),
  KEYCLOAK_JWKS_URI: Joi.string().uri().required(),
  KEYCLOAK_API_CLIENT_ID: Joi.string().required(),
  KEYCLOAK_API_CLIENT_SECRET: Joi.string().required(),
  KEYCLOAK_WEB_CLIENT_ID: Joi.string().required(),
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_PRICE_ID: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
});

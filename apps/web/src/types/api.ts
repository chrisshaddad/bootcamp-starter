/**
 * API contract types for the web client.
 *
 * The source of truth now lives in the shared `@repo/contracts` workspace
 * package, consumed by both this app and the NestJS backend (forward-mena-be)
 * so the two cannot drift. This file re-exports it, so existing
 * `@/types/api` imports across the app keep working unchanged.
 */
export type * from '@repo/contracts';

-- Keycloak is now the single source of truth for users, roles, and org membership.
-- Identity/role/membership data no longer lives in Postgres.
-- Drop the Membership and User tables (and the now-unused Role enum).
-- BuildingAssignment.userId and Event.actorId remain plain strings (Keycloak sub).

DROP TABLE IF EXISTS "Membership" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TYPE IF EXISTS "Role";

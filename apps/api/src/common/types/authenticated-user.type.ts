import { Role } from '@/common/enums';

export interface AuthenticatedUser {
  sub: string;
  email?: string;
  preferredUsername?: string;
  fullName?: string;
  phone?: string;
  /** All role names from the token (realm roles + web-client roles), unfiltered. */
  realmRoles: string[];
  /** App roles present on the token (realm + client), filtered to the Role enum. */
  roles: Role[];
  /** org_id claim from the token — authoritative (Keycloak is the source of truth). */
  orgId?: string;
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import { Role } from '@/common/enums';

interface KeycloakRoleRepresentation {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface KeycloakUser {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  createdTimestamp?: number;
  attributes?: Record<string, string[]>;
}

interface CreateUserOptions {
  email: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, string[]>;
  realmRoles?: string[];
  requiredActions?: string[];
}

interface CreateUserWithPasswordOptions {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  attributes?: Record<string, string[]>;
}

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private readonly http: AxiosInstance;
  private accessToken?: string;
  private expiresAt = 0;
  private clientUuidCache: Record<string, string> = {};

  constructor(private readonly configService: ConfigService) {
    this.http = axios.create({
      baseURL: configService.getOrThrow<string>('keycloak.baseUrl'),
      timeout: 10_000,
    });
  }

  private get realm(): string {
    return this.configService.getOrThrow<string>('keycloak.realm');
  }

  /** The OIDC web client whose CLIENT roles are the app's source of truth for roles. */
  private get webClientId(): string {
    return this.configService.getOrThrow<string>('keycloak.webClientId');
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken;
    }
    const clientId = this.configService.getOrThrow<string>(
      'keycloak.adminClientId',
    );
    const clientSecret = this.configService.getOrThrow<string>(
      'keycloak.adminClientSecret',
    );
    const form = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });
    const { data } = await this.http.post<{
      access_token: string;
      expires_in: number;
    }>(`/realms/${this.realm}/protocol/openid-connect/token`, form, {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + Math.max(data.expires_in - 30, 1) * 1000;
    return this.accessToken;
  }

  /** Assign a realm role to a Keycloak user (idempotent). */
  async assignRealmRole(userId: string, role: Role): Promise<void> {
    const token = await this.getAccessToken();
    const roleName = role as string;
    this.logger.log(`Assigning realm role '${roleName}' to user ${userId}`);
    try {
      const { data: roleRep } = await this.http.get<KeycloakRoleRepresentation>(
        `/admin/realms/${this.realm}/roles/${encodeURIComponent(roleName)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await this.http.post(
        `/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        [roleRep],
        { headers: { Authorization: `Bearer ${token}` } },
      );
      this.logger.log(`Role '${roleName}' assigned to ${userId}`);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        this.logger.log(`Role '${roleName}' already on user ${userId}`);
        return;
      }
      throw error;
    }
  }

  /**
   * Make `role` the user's ONLY app realm role: add it if missing and remove
   * every other app-managed realm role. `assignRealmRole` alone only adds, so a
   * role change would leave the previous role attached and `pickPrimaryRole`
   * would resolve to the highest-precedence stale role — DB role ≠ session role.
   */
  async setSingleAppRealmRole(userId: string, role: Role): Promise<void> {
    const token = await this.getAccessToken();
    const target = role as string;
    const appRoleNames = new Set<string>(Object.values(Role));

    const { data: current } = await this.http.get<KeycloakRoleRepresentation[]>(
      `/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const stale = current.filter(
      (r) => appRoleNames.has(r.name) && r.name !== target,
    );

    // Add the target first (idempotent). If the sequence is interrupted after
    // this point the user keeps BOTH roles (recoverable on the next change),
    // rather than none — which would strip their access entirely.
    if (!current.some((r) => r.name === target)) {
      await this.assignRealmRole(userId, role);
    }

    if (stale.length) {
      await this.http.delete(
        `/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        { headers: { Authorization: `Bearer ${token}` }, data: stale },
      );
      this.logger.log(
        `Removed stale realm roles [${stale
          .map((r) => r.name)
          .join(', ')}] from ${userId}`,
      );
    }
  }

  /**
   * Update a Keycloak user while PRESERVING the full representation.
   * A partial `PUT { … }` against a realm with declarative User Profile enabled
   * wipes managed fields (email/firstName/lastName) that aren't in the body —
   * which leaves the account "not fully set up" and unable to log in. So we
   * always fetch the current rep and PUT it back with the patch merged in.
   */
  private async patchUserRep(
    userId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const token = await this.getAccessToken();
    const { data: user } = await this.http.get<Record<string, unknown>>(
      `/admin/realms/${this.realm}/users/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    await this.http.put(
      `/admin/realms/${this.realm}/users/${userId}`,
      { ...user, ...patch },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /** Set a user attribute (e.g. org_id), preserving all other user fields. */
  async setUserAttribute(
    userId: string,
    key: string,
    value: string,
  ): Promise<void> {
    const token = await this.getAccessToken();
    const { data: user } = await this.http.get<{
      attributes?: Record<string, string[]>;
    }>(`/admin/realms/${this.realm}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const attrs = { ...(user.attributes ?? {}), [key]: [value] };
    await this.patchUserRep(userId, { attributes: attrs });
    this.logger.log(`Set attribute '${key}=${value}' on user ${userId}`);
  }

  /** Create a Keycloak user and return their id (sub). */
  async createUser(options: CreateUserOptions): Promise<string> {
    const token = await this.getAccessToken();
    const nameParts = (options.firstName ?? '').split(' ');
    const firstName = options.firstName ?? '';
    const lastName = options.lastName ?? '';

    const response = await this.http.post(
      `/admin/realms/${this.realm}/users`,
      {
        email: options.email,
        firstName,
        lastName,
        username: options.email,
        enabled: true,
        emailVerified: false,
        attributes: options.attributes ?? {},
        requiredActions: options.requiredActions ?? ['UPDATE_PASSWORD'],
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    // Keycloak returns the user Location header
    const location = response.headers['location'] as string | undefined;
    if (location) {
      const parts = location.split('/');
      return parts[parts.length - 1];
    }

    // Fallback: search by email
    const { data } = await this.http.get<Array<{ id: string }>>(
      `/admin/realms/${this.realm}/users`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { email: options.email, exact: true },
      },
    );
    if (!data.length) {
      throw new Error(`Could not resolve created user id for ${options.email}`);
    }
    return data[0].id;
  }

  /**
   * Create a Keycloak user with a NON-TEMPORARY password set at creation.
   * Used for admin-created staff: enabled=true, no requiredActions, no email send.
   * Returns the new user's Keycloak sub (id).
   */
  async createUserWithPassword(
    options: CreateUserWithPasswordOptions,
  ): Promise<string> {
    const token = await this.getAccessToken();

    const response = await this.http.post(
      `/admin/realms/${this.realm}/users`,
      {
        username: options.username,
        // The realm refuses login for accounts that are not "fully set up"
        // (it requires a verified email). Admin-created staff log in with their
        // USERNAME; email is optional in the UI, so synthesize a placeholder
        // when omitted and always mark it verified so the account can log in
        // immediately with the credentials the admin set. (Our own DB still
        // stores the real email or null — see UsersService.create.)
        email: options.email ?? `${options.username}@no-email.local`,
        // The realm's user profile requires non-empty firstName + lastName for
        // the account to be "fully set up" (otherwise login fails with
        // "Account is not fully set up"). fullName is optional in the admin UI,
        // so fall back to the username when a name part is missing.
        firstName: (options.firstName ?? '').trim() || options.username,
        lastName:
          (options.lastName ?? '').trim() ||
          (options.firstName ?? '').trim() ||
          options.username,
        enabled: true,
        emailVerified: true,
        attributes: options.attributes ?? {},
        requiredActions: [],
        credentials: [
          {
            type: 'password',
            value: options.password,
            temporary: false,
          },
        ],
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const location = response.headers['location'] as string | undefined;
    if (location) {
      const parts = location.split('/');
      return parts[parts.length - 1];
    }

    // Fallback: search by username
    const { data } = await this.http.get<Array<{ id: string }>>(
      `/admin/realms/${this.realm}/users`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { username: options.username, exact: true },
      },
    );
    if (!data.length) {
      throw new Error(
        `Could not resolve created user id for username '${options.username}'`,
      );
    }
    return data[0].id;
  }

  /** Send a "reset credentials" email (password set) to a user. */
  async sendRequiredActionsEmail(userId: string): Promise<void> {
    const token = await this.getAccessToken();
    await this.http.put(
      `/admin/realms/${this.realm}/users/${userId}/execute-actions-email`,
      ['UPDATE_PASSWORD'],
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /** Delete (or disable) a user. */
  async disableUser(userId: string): Promise<void> {
    await this.setUserEnabled(userId, false);
  }

  async getUser(sub: string): Promise<Record<string, unknown> | null> {
    try {
      const token = await this.getAccessToken();
      const { data } = await this.http.get<Record<string, unknown>>(
        `/admin/realms/${this.realm}/users/${sub}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data;
    } catch (error) {
      this.logger.warn(`Unable to fetch user ${sub}: ${String(error)}`);
      return null;
    }
  }

  /** Generate a temporary password and set it. Returns the temp password. */
  async setTemporaryPassword(userId: string): Promise<string> {
    const token = await this.getAccessToken();
    const tempPassword =
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10).toUpperCase() +
      '!1';
    await this.http.put(
      `/admin/realms/${this.realm}/users/${userId}/reset-password`,
      { type: 'password', value: tempPassword, temporary: true },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return tempPassword;
  }

  // ── Keycloak as source of truth: client roles + user management ───────────

  private clientUuidByClientId: Record<string, string> = {};

  /** Resolve (and cache) the internal UUID of a client from its clientId. */
  async getClientUuid(clientId: string): Promise<string> {
    if (this.clientUuidByClientId[clientId]) {
      return this.clientUuidByClientId[clientId];
    }
    const token = await this.getAccessToken();
    const { data } = await this.http.get<Array<{ id: string }>>(
      `/admin/realms/${this.realm}/clients`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { clientId },
      },
    );
    if (!data?.length) {
      throw new Error(`Keycloak client not found: ${clientId}`);
    }
    this.clientUuidByClientId[clientId] = data[0].id;
    return data[0].id;
  }

  /**
   * Make `role` the user's ONLY app CLIENT role on the web client: add it if
   * missing, then remove every other app-managed client role. Add-then-remove
   * order so an interruption leaves both roles (recoverable), never none.
   */
  async setSingleClientRole(userId: string, role: Role): Promise<void> {
    const clientUuid = await this.getClientUuid(this.webClientId);
    const token = await this.getAccessToken();
    const target = role as string;
    const appRoleNames = new Set<string>(Object.values(Role));
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const mappingUrl = `/admin/realms/${this.realm}/users/${userId}/role-mappings/clients/${clientUuid}`;

    const { data: current } = await this.http.get<KeycloakRoleRepresentation[]>(
      mappingUrl,
      auth,
    );

    if (!current.some((r) => r.name === target)) {
      const { data: roleRep } = await this.http.get<KeycloakRoleRepresentation>(
        `/admin/realms/${this.realm}/clients/${clientUuid}/roles/${encodeURIComponent(target)}`,
        auth,
      );
      await this.http.post(mappingUrl, [roleRep], auth);
    }

    const stale = current.filter(
      (r) => appRoleNames.has(r.name) && r.name !== target,
    );
    if (stale.length) {
      await this.http.delete(mappingUrl, { ...auth, data: stale });
      this.logger.log(
        `Removed stale client roles [${stale
          .map((r) => r.name)
          .join(', ')}] from ${userId}`,
      );
    }
  }

  /** All users in an org, resolved by the org_id attribute (server-side search). */
  async searchUsersByOrg(orgId: string): Promise<KeycloakUser[]> {
    const token = await this.getAccessToken();
    const { data } = await this.http.get<KeycloakUser[]>(
      `/admin/realms/${this.realm}/users`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: `org_id:${orgId}`, max: 1000, briefRepresentation: false },
      },
    );
    return data ?? [];
  }

  /** The app client-role names currently assigned to a single user. */
  async getUserClientRoles(userId: string): Promise<string[]> {
    const clientUuid = await this.getClientUuid(this.webClientId);
    const token = await this.getAccessToken();
    const { data } = await this.http.get<KeycloakRoleRepresentation[]>(
      `/admin/realms/${this.realm}/users/${userId}/role-mappings/clients/${clientUuid}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return (data ?? []).map((r) => r.name);
  }

  /** All users that hold a given app client role (across the realm). */
  async getUsersWithClientRole(role: Role): Promise<KeycloakUser[]> {
    const clientUuid = await this.getClientUuid(this.webClientId);
    const token = await this.getAccessToken();
    const { data } = await this.http.get<KeycloakUser[]>(
      `/admin/realms/${this.realm}/clients/${clientUuid}/roles/${encodeURIComponent(role)}/users`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { max: 1000 },
      },
    );
    return data ?? [];
  }

  /** Hard-delete a Keycloak user. */
  async deleteUser(userId: string): Promise<void> {
    const token = await this.getAccessToken();
    await this.http.delete(`/admin/realms/${this.realm}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /** Enable or disable a Keycloak user (controls whether they can log in). */
  async setUserEnabled(userId: string, enabled: boolean): Promise<void> {
    await this.patchUserRep(userId, { enabled });
  }
}

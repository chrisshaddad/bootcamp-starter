import type { DefaultSession } from 'next-auth';
import type { Role } from '@/auth/roles';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    idToken?: string;
    role?: Role | null;
    orgId?: string | null;
    error?: 'RefreshAccessTokenError';
    user: DefaultSession['user'] & {
      role?: Role | null;
    };
  }

  interface User {
    role?: Role | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt?: number;
    role?: Role | null;
    orgId?: string | null;
    error?: 'RefreshAccessTokenError';
  }
}

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Role } from '@/auth/roles';

export type AuthState = {
  role: Role | null;
  orgId: string | null;
  isAuthenticated: boolean;
};

export const initialAuthState: AuthState = {
  role: null,
  orgId: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    sessionSynced(
      state,
      action: PayloadAction<{
        role?: Role | null;
        orgId?: string | null;
      } | null>,
    ) {
      state.role = action.payload?.role ?? null;
      state.orgId = action.payload?.orgId ?? null;
      state.isAuthenticated = Boolean(action.payload);
    },
    sessionCleared() {
      return initialAuthState;
    },
  },
});

export const { sessionSynced, sessionCleared } = authSlice.actions;
export const authReducer = authSlice.reducer;

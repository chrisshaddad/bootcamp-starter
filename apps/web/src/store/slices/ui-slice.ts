import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import {
  defaultLocale,
  getDirection,
  type Direction,
  type Locale,
} from '@/i18n/config';

export type ThemeMode = 'light' | 'dark' | 'system';

export type UiState = {
  locale: Locale;
  direction: Direction;
  theme: ThemeMode;
};

export const initialUiState: UiState = {
  locale: defaultLocale,
  direction: getDirection(defaultLocale),
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUiState,
  reducers: {
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
      state.direction = getDirection(action.payload);
    },
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
  },
});

export const { setLocale, setTheme } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;

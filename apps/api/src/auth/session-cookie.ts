import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'bootcamp_starter_session';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export const SESSION_COOKIE_SET_OPTIONS: CookieOptions = {
  ...SESSION_COOKIE_OPTIONS,
  maxAge: SESSION_MAX_AGE_MS,
};

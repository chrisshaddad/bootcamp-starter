import axios, { type AxiosRequestConfig } from 'axios';

import { auth } from '@/auth/auth';
import { serverEnv } from '@/lib/env';
import { mapAxiosError } from './error-mapper';

export const serverApiClient = axios.create({
  baseURL: serverEnv.API_URL,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
  },
});

serverApiClient.interceptors.request.use(async (config) => {
  const session = await auth();

  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

serverApiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(mapAxiosError(error)),
);

export type ServerApiRequestConfig = AxiosRequestConfig & {
  path: string;
};

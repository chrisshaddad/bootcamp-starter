import axios, { type AxiosError } from 'axios';

import type { ApiErrorEnvelope } from '@/types/api';

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'The request was invalid.',
  401: 'Authentication is required.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'The request conflicts with the current state.',
  422: 'Some fields are invalid.',
  429: 'Too many requests. Please try again later.',
  500: 'The server failed to process the request.',
  502: 'The upstream service is unavailable.',
  503: 'The service is temporarily unavailable.',
  504: 'The upstream service timed out.',
};

function statusCode(status: number | undefined) {
  if (!status) return 500;
  if (DEFAULT_MESSAGES[status]) return status;
  if (status >= 500) return 500;
  if (status >= 400) return status;
  return 500;
}

function getFieldErrors(data: unknown): Record<string, string[]> | undefined {
  if (!data || typeof data !== 'object') return undefined;

  const candidate = data as { fieldErrors?: unknown; errors?: unknown };
  const fieldErrors = candidate.fieldErrors ?? candidate.errors;

  if (
    !fieldErrors ||
    typeof fieldErrors !== 'object' ||
    Array.isArray(fieldErrors)
  ) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages.map(String) : [String(messages)],
    ]),
  );
}

function getMessage(data: unknown, status: number) {
  if (data && typeof data === 'object') {
    const payload = data as {
      message?: unknown;
      error?: unknown;
      detail?: unknown;
    };
    const message = payload.message ?? payload.error ?? payload.detail;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return DEFAULT_MESSAGES[status] ?? 'Request failed.';
}

export function mapAxiosError(error: unknown): ApiErrorEnvelope {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = statusCode(axiosError.response?.status);

    return {
      status,
      code: axiosError.code ?? `HTTP_${status}`,
      message: axiosError.response
        ? getMessage(axiosError.response.data, status)
        : 'Unable to reach the server. Check your connection and try again.',
      fieldErrors: getFieldErrors(axiosError.response?.data),
    };
  }

  if (error instanceof Error) {
    return { status: 500, code: 'UNKNOWN_ERROR', message: error.message };
  }

  return {
    status: 500,
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred.',
  };
}

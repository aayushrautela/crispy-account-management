import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_CRISPY_API_URL?.trim();

if (!API_BASE_URL) {
  throw new Error('VITE_CRISPY_API_URL is not configured.');
}

function buildUrl(path: string): string {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveErrorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }

    if (isRecord(payload.error)) {
      if (typeof payload.error.message === 'string' && payload.error.message.trim()) {
        return payload.error.message;
      }

      if (typeof payload.error.code === 'string' && payload.error.code.trim()) {
        return payload.error.code;
      }
    }
  }

  return fallback;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error('Sign in again to continue.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, `Request failed with status ${response.status}.`));
  }

  if (isRecord(payload) && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

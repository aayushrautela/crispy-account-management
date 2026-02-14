import { AuthApiError } from '@supabase/supabase-js';

const UNIQUE_VIOLATION = '23505';

function isAuthError(error: unknown): error is AuthApiError {
  return error instanceof AuthApiError;
}

export function toErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function mapSupabaseError(error: unknown, fallback = 'Request failed.'): string {
  if (!error) {
    return fallback;
  }

  if (isAuthError(error)) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeCode = 'code' in error ? String(error.code) : '';
    const maybeMessage = 'message' in error ? String(error.message) : '';

    if (maybeCode === UNIQUE_VIOLATION) {
      if (maybeMessage.toLowerCase().includes('lower')) {
        return 'A profile with this name already exists in your household.';
      }

      return 'This value must be unique. Please choose another one.';
    }

    if (maybeMessage) {
      return maybeMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

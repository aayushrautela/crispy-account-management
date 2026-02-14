import { emailSchema, passwordSchema } from '../contracts';
import { mapSupabaseError } from '../lib/errors';
import { supabase } from '../lib/supabase';

export interface SignUpResult {
  requiresEmailVerification: boolean;
}

function normalizeCredentials(email: string, password: string): { email: string; password: string } {
  return {
    email: emailSchema.parse(email),
    password: passwordSchema.parse(password),
  };
}

export async function signInWithEmailPassword(email: string, password: string): Promise<void> {
  const credentials = normalizeCredentials(email, password);
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    throw new Error(mapSupabaseError(error, 'Unable to sign in.'));
  }
}

export async function signUpWithEmailPassword(email: string, password: string): Promise<SignUpResult> {
  const credentials = normalizeCredentials(email, password);
  const { data, error } = await supabase.auth.signUp(credentials);

  if (error) {
    throw new Error(mapSupabaseError(error, 'Unable to create account.'));
  }

  return {
    requiresEmailVerification: !data.session,
  };
}

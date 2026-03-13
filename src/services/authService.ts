import { emailSchema, passwordSchema } from '../contracts';
import { mapSupabaseError } from '../lib/errors';
import { supabase } from '../lib/supabase';

export interface SignUpResult {
  requiresEmailVerification: boolean;
}

interface SignUpOptions {
  referralCode?: string;
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

export async function signUpWithEmailPassword(
  email: string,
  password: string,
  options: SignUpOptions = {},
): Promise<SignUpResult> {
  const credentials = normalizeCredentials(email, password);
  const referralCode = options.referralCode?.trim();
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: referralCode
      ? {
          data: {
            referralCode,
            referalCode: referralCode,
          },
        }
      : undefined,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, 'Unable to create account.'));
  }

  return {
    requiresEmailVerification: !data.session,
  };
}

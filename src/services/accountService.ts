import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/errors';
import { emailSchema, passwordSchema } from '../contracts';

const DELETE_ACCOUNT_FUNCTION = 'delete-account';

export async function updateUserEmail(email: string): Promise<void> {
  const parsedEmail = emailSchema.parse(email);
  const { error } = await supabase.auth.updateUser({ email: parsedEmail });

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to update email.'));
  }
}

export async function updateUserPassword(password: string): Promise<void> {
  const parsedPassword = passwordSchema.parse(password);
  const { error } = await supabase.auth.updateUser({ password: parsedPassword });

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to update password.'));
  }
}

export async function deleteCurrentAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke(DELETE_ACCOUNT_FUNCTION, {
    body: {},
  });

  if (error) {
    throw new Error(
      mapSupabaseError(
        error,
        `Failed to delete account. Ensure the ${DELETE_ACCOUNT_FUNCTION} edge function is deployed.`,
      ),
    );
  }
}

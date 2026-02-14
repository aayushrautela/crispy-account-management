import { parseMembershipPayload, type MembershipRecord } from '../contracts';
import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/errors';

export async function ensureHouseholdMembership(userId: string): Promise<MembershipRecord> {
  const { data, error } = await supabase.rpc('ensure_household_membership');

  if (!error) {
    return parseMembershipPayload(data);
  }

  const fallback = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (fallback.error) {
    throw new Error(mapSupabaseError(fallback.error, 'Failed to resolve household membership.'));
  }

  return parseMembershipPayload(fallback.data);
}

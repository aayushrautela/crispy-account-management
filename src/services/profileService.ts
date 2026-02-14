import {
  avatarUrlSchema,
  profileNameSchema,
} from '../contracts';
import type { Profile } from '../types';
import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/errors';

export interface SaveProfileInput {
  householdId: string;
  userId: string;
  name: string;
  avatar: string | null;
}

export interface UpdateProfileInput {
  householdId: string;
  profileId: string;
  name: string;
  avatar: string | null;
}

function normalizeProfilePayload(name: string, avatar: string | null): { name: string; avatar: string | null } {
  const parsedName = profileNameSchema.parse(name);
  const parsedAvatar = avatarUrlSchema.parse(avatar);

  return {
    name: parsedName,
    avatar: parsedAvatar,
  };
}

async function getNextOrderIndex(householdId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('order_index')
    .eq('household_id', householdId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to calculate profile order.'));
  }

  return (data?.order_index ?? -1) + 1;
}

export async function listProfiles(householdId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('household_id', householdId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to load profiles.'));
  }

  return data ?? [];
}

export async function createProfile(input: SaveProfileInput): Promise<Profile> {
  const normalized = normalizeProfilePayload(input.name, input.avatar);
  const nextOrderIndex = await getNextOrderIndex(input.householdId);

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      household_id: input.householdId,
      created_by: input.userId,
      order_index: nextOrderIndex,
      name: normalized.name,
      avatar: normalized.avatar,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to create profile.'));
  }

  return data;
}

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const normalized = normalizeProfilePayload(input.name, input.avatar);

  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: normalized.name,
      avatar: normalized.avatar,
    })
    .eq('household_id', input.householdId)
    .eq('id', input.profileId)
    .select('*')
    .single();

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to update profile.'));
  }

  return data;
}

export async function deleteProfile(householdId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('household_id', householdId)
    .eq('id', profileId);

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to delete profile.'));
  }
}

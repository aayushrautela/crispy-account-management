import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/errors';
import type { Json } from '@crispy-streaming/supabase-contract';

export interface Addon {
  url: string;
  enabled: boolean;
  name: string | null;
}

export async function getHouseholdAddons(): Promise<Addon[]> {
  const { data, error } = await supabase.rpc('get_household_addons');

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to load addons.'));
  }

  return (data as unknown as Addon[]) ?? [];
}

export async function replaceHouseholdAddons(addons: Addon[]): Promise<void> {
  const { error } = await supabase.rpc('replace_household_addons', {
    p_addons: addons as unknown as Json,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to update addons.'));
  }
}

export async function addAddon(url: string): Promise<void> {
  const addons = await getHouseholdAddons();
  
  let normalizedUrl = url.trim();
  if (normalizedUrl.startsWith('stremio://')) {
    normalizedUrl = normalizedUrl.replace('stremio://', 'https://');
  } else if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  if (addons.some(a => a.url === normalizedUrl)) {
    return;
  }

  const newAddons = [...addons, { url: normalizedUrl, enabled: true, name: null }];
  await replaceHouseholdAddons(newAddons);
}

export async function removeAddon(url: string): Promise<void> {
  const addons = await getHouseholdAddons();
  const newAddons = addons.filter(a => a.url !== url);
  await replaceHouseholdAddons(newAddons);
}

export async function toggleAddon(url: string): Promise<void> {
  const addons = await getHouseholdAddons();
  const newAddons = addons.map(a =>
    a.url === url ? { ...a, enabled: !a.enabled } : a
  );
  await replaceHouseholdAddons(newAddons);
}

import { supabase } from './supabase';

const ACTIVE_HOUSEHOLD_KEY = 'crispy.active-household-id';
const ACTIVE_PROFILE_PREFIX = 'crispy.active-profile';
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

function activeProfileKey(householdId: string): string {
  return `${ACTIVE_PROFILE_PREFIX}:${householdId}`;
}

export const StorageService = {
  setActiveHouseholdId(householdId: string): void {
    localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, householdId);
  },

  getActiveHouseholdId(): string | null {
    return localStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
  },

  clearActiveHouseholdId(): void {
    localStorage.removeItem(ACTIVE_HOUSEHOLD_KEY);
  },

  setActiveProfileId(householdId: string, profileId: string): void {
    localStorage.setItem(activeProfileKey(householdId), profileId);
  },

  getActiveProfileId(householdId: string): string | null {
    return localStorage.getItem(activeProfileKey(householdId));
  },

  clearActiveProfileId(householdId: string): void {
    localStorage.removeItem(activeProfileKey(householdId));
  },

  clearAllSessionScope(): void {
    const householdId = this.getActiveHouseholdId();

    if (householdId) {
      this.clearActiveProfileId(householdId);
    }

    this.clearActiveHouseholdId();
  },
};

function assertAvatarFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported for avatars.');
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error('Avatar file must be 2MB or smaller.');
  }
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  assertAvatarFile(file);

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
  const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error('Avatar uploaded but no public URL was returned.');
  }

  return data.publicUrl;
}

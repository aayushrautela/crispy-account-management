import { supabase } from './supabase';

const ACTIVE_PROFILE_KEY = 'crispy.active-profile-id';
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

export const StorageService = {
  setActiveProfileId(profileId: string): void {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  },

  getActiveProfileId(): string | null {
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
  },

  clearActiveProfileId(): void {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  },

  clearAllSessionScope(): void {
    this.clearActiveProfileId();
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

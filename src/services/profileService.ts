import { avatarUrlSchema, profileNameSchema } from '../contracts';
import type { Profile } from '../types';
import { jsonBody, apiRequest } from '../lib/apiClient';

export interface SaveProfileInput {
  name: string;
  avatarKey: string | null;
}

export interface UpdateProfileInput {
  profileId: string;
  name: string;
  avatarKey: string | null;
}

function compareProfilesForPrimary(
  left: Pick<Profile, 'sortOrder' | 'createdAt' | 'id'>,
  right: Pick<Profile, 'sortOrder' | 'createdAt' | 'id'>,
): number {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  if (left.createdAt !== right.createdAt) {
    return left.createdAt.localeCompare(right.createdAt);
  }

  return left.id.localeCompare(right.id);
}

export function sortProfilesByPrimaryRule(items: Profile[]): Profile[] {
  return [...items].sort(compareProfilesForPrimary);
}

function normalizeProfilePayload(name: string, avatarKey: string | null): { name: string; avatarKey: string | null } {
  const parsedName = profileNameSchema.parse(name);
  const parsedAvatar = avatarUrlSchema.parse(avatarKey);

  return {
    name: parsedName,
    avatarKey: parsedAvatar,
  };
}

export async function listProfiles(): Promise<Profile[]> {
  const data = await apiRequest<{ profiles: Profile[] }>('/v1/profiles');
  return sortProfilesByPrimaryRule(data.profiles);
}

export async function getPrimaryProfile(fallbackProfiles: Profile[] = []): Promise<Profile | null> {
  const sortedFallback = sortProfilesByPrimaryRule(fallbackProfiles);
  if (sortedFallback[0]) {
    return sortedFallback[0];
  }

  const profiles = await listProfiles();
  return profiles[0] ?? null;
}

export async function createProfile(input: SaveProfileInput): Promise<Profile> {
  const normalized = normalizeProfilePayload(input.name, input.avatarKey);
  const data = await apiRequest<{ profile: Profile }>('/v1/profiles', {
    method: 'POST',
    body: jsonBody({
      name: normalized.name,
      avatarKey: normalized.avatarKey,
      interfaceLanguage: 'en',
    }),
  });

  return data.profile;
}

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const normalized = normalizeProfilePayload(input.name, input.avatarKey);
  const data = await apiRequest<{ profile: Profile }>(`/v1/profiles/${encodeURIComponent(input.profileId)}`, {
    method: 'PATCH',
    body: jsonBody({
      name: normalized.name,
      avatarKey: normalized.avatarKey,
    }),
  });

  return data.profile;
}

export async function deleteProfile(): Promise<void> {
  throw new Error('Profile deletion is not supported.');
}

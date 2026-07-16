import { StorageService } from '../lib/storage';
import { jsonBody, apiRequest } from '../lib/apiClient';
import type { Profile } from '../types';
import { createProfile, getPrimaryProfile, listProfiles, sortProfilesByPrimaryRule } from './profileService';

export type SyncService = 'trakt' | 'simkl';
export type OnboardingStatus = 'unknown' | 'required' | 'complete';

interface OnboardingSettingsRecord {
  syncProvider?: SyncService;
  onboarding?: {
    selectedService?: SyncService;
    completedAt?: string;
    updatedAt?: string;
  };
  openRouter?: {
    configuredAt?: string;
  };
}

export interface OnboardingState {
  status: OnboardingStatus;
  profileId: string | null;
  selectedService: SyncService | null;
  connectedService: SyncService | null;
  traktConnected: boolean;
  simklConnected: boolean;
  openRouterConfigured: boolean;
}

export interface ProviderAuthIntent {
  targetProfileId?: string;
  returnTo?: string;
}

interface ProviderState {
  provider: SyncService;
  connectionState: 'not_connected' | 'pending_authorization' | 'connected' | 'reauthorization_required';
  accountStatus: string | null;
  primaryAction: 'connect' | 'import' | 'reconnect';
  canImport: boolean;
  canReconnect: boolean;
  canDisconnect: boolean;
  externalUsername: string | null;
  statusLabel: string;
  statusMessage: string | null;
  lastImportCompletedAt: string | null;
}

interface ProviderConnectionsResponse {
  providerStates: ProviderState[];
  watchDataState: unknown;
}

interface ProfileSettingsResponse {
  settings: Record<string, unknown>;
}

interface ProviderStartResponse {
  authUrl: string | null;
  nextAction: 'authorize_provider' | 'queued';
}

const DEFAULT_PROFILE_NAME = 'Main Profile';
const PENDING_PROVIDER_AUTH_STORAGE_KEY = 'crispy.pending-provider-auth';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSyncService(value: unknown): SyncService | null {
  return value === 'trakt' || value === 'simkl' ? value : null;
}

function parseSettings(value: unknown): OnboardingSettingsRecord {
  if (!isRecord(value)) {
    return {};
  }

  const onboarding = isRecord(value.onboarding)
    ? {
        ...(parseSyncService(value.onboarding.selectedService) ? { selectedService: parseSyncService(value.onboarding.selectedService) ?? undefined } : {}),
        ...(typeof value.onboarding.completedAt === 'string' ? { completedAt: value.onboarding.completedAt } : {}),
        ...(typeof value.onboarding.updatedAt === 'string' ? { updatedAt: value.onboarding.updatedAt } : {}),
      }
    : {
        ...(parseSyncService(value['onboarding.selectedService']) ? { selectedService: parseSyncService(value['onboarding.selectedService']) ?? undefined } : {}),
        ...(typeof value['onboarding.completedAt'] === 'string' ? { completedAt: value['onboarding.completedAt'] as string } : {}),
        ...(typeof value['onboarding.updatedAt'] === 'string' ? { updatedAt: value['onboarding.updatedAt'] as string } : {}),
      };

  const openRouter = isRecord(value.openRouter)
    ? {
        configuredAt: typeof value.openRouter.configuredAt === 'string' ? value.openRouter.configuredAt : undefined,
      }
    : typeof value['openRouter.configuredAt'] === 'string'
      ? { configuredAt: value['openRouter.configuredAt'] as string }
      : undefined;

  return {
    ...(parseSyncService(value.syncProvider) ? { syncProvider: parseSyncService(value.syncProvider) ?? undefined } : {}),
    onboarding,
    openRouter,
  };
}

function sanitizeReturnTo(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.startsWith('/') ? trimmed : null;
}

function buildOnboardingState(profileId: string | null, settings: Record<string, unknown>, connections: ProviderConnectionsResponse | null): OnboardingState {
  const parsedSettings = parseSettings(settings);
  const selectedService = parsedSettings.onboarding?.selectedService ?? parsedSettings.syncProvider ?? null;
  const traktConnected = connections?.providerStates.some((state) => state.provider === 'trakt' && state.connectionState === 'connected') ?? false;
  const simklConnected = connections?.providerStates.some((state) => state.provider === 'simkl' && state.connectionState === 'connected') ?? false;

  let connectedService: SyncService | null = null;

  if (selectedService === 'trakt' && traktConnected) {
    connectedService = 'trakt';
  } else if (selectedService === 'simkl' && simklConnected) {
    connectedService = 'simkl';
  } else if (traktConnected) {
    connectedService = 'trakt';
  } else if (simklConnected) {
    connectedService = 'simkl';
  }

  return {
    status: connectedService ? 'complete' : 'required',
    profileId,
    selectedService,
    connectedService,
    traktConnected,
    simklConnected,
    openRouterConfigured: Boolean(parsedSettings.openRouter?.configuredAt) || typeof settings['ai.openrouter_key'] === 'string',
  };
}

async function ensureOnboardingProfile(): Promise<Profile> {
  const profiles = await listProfiles();
  const primaryProfile = await getPrimaryProfile(profiles);

  if (primaryProfile) {
    StorageService.setActiveProfileId(primaryProfile.id);
    return primaryProfile;
  }

  const sortedProfiles = sortProfilesByPrimaryRule(profiles);

  if (sortedProfiles[0]) {
    StorageService.setActiveProfileId(sortedProfiles[0].id);
    return sortedProfiles[0];
  }

  const profile = await createProfile({
    name: DEFAULT_PROFILE_NAME,
    avatarKey: null,
  });

  StorageService.setActiveProfileId(profile.id);
  return profile;
}

async function loadProfileSettings(profileId: string): Promise<Record<string, unknown>> {
  const data = await apiRequest<ProfileSettingsResponse>(`/v1/profiles/${encodeURIComponent(profileId)}/settings`);
  return data.settings;
}

async function patchProfileSettings(profileId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  const data = await apiRequest<ProfileSettingsResponse>(`/v1/profiles/${encodeURIComponent(profileId)}/settings`, {
    method: 'PATCH',
    body: jsonBody(patch),
  });
  return data.settings;
}

async function loadProviderConnections(profileId: string): Promise<ProviderConnectionsResponse> {
  return apiRequest<ProviderConnectionsResponse>(`/v1/profiles/${encodeURIComponent(profileId)}/import-connections`);
}

function mergeSettings(base: unknown, service: SyncService, markComplete = false): Record<string, string> {
  const map: Record<string, string> = {};
  if (isRecord(base)) {
    for (const [key, value] of Object.entries(base)) {
      if (typeof value === 'string') {
        map[key] = value;
      }
    }
  }

  const now = new Date().toISOString();

  map.syncProvider = service;
  map['onboarding.selectedService'] = service;
  map['onboarding.updatedAt'] = now;

  if (markComplete && !map['onboarding.completedAt']) {
    map['onboarding.completedAt'] = now;
  }

  return map;
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const profile = await ensureOnboardingProfile();
  return getProfileOnboardingState(profile.id);
}

export async function getProfileOnboardingState(profileId: string): Promise<OnboardingState> {
  const [settings, connections] = await Promise.all([
    loadProfileSettings(profileId),
    loadProviderConnections(profileId).catch(() => null),
  ]);
  return buildOnboardingState(profileId, settings, connections);
}

export async function listProfileOnboardingStates(profileIds: string[]): Promise<Record<string, OnboardingState>> {
  const entries = await Promise.all(
    profileIds.map(async (profileId) => [profileId, await getProfileOnboardingState(profileId)] as const),
  );

  return Object.fromEntries(entries);
}

export async function setSelectedSyncService(
  service: SyncService,
): Promise<OnboardingState> {
  const profile = await ensureOnboardingProfile();
  const settings = await loadProfileSettings(profile.id);

  await patchProfileSettings(profile.id, mergeSettings(settings, service));

  return getOnboardingState();
}

export async function saveProviderAuth(
  service: SyncService,
): Promise<OnboardingState> {
  const profile = await ensureOnboardingProfile();
  await saveProviderAuthForProfile(profile.id, service);

  return getOnboardingState();
}

export async function saveProviderAuthForProfile(
  profileId: string,
  service: SyncService,
): Promise<OnboardingState> {
  const settings = await loadProfileSettings(profileId);
  await patchProfileSettings(profileId, mergeSettings(settings, service, true));
  return getProfileOnboardingState(profileId);
}

async function beginProviderAuth(provider: SyncService, intent: ProviderAuthIntent = {}): Promise<void> {
  const targetProfileId = intent.targetProfileId ?? StorageService.getActiveProfileId();

  if (!targetProfileId) {
    throw new Error('Profile context is not ready yet.');
  }

  window.sessionStorage.setItem(PENDING_PROVIDER_AUTH_STORAGE_KEY, JSON.stringify({
    provider,
    targetProfileId,
    returnTo: sanitizeReturnTo(intent.returnTo),
    createdAt: new Date().toISOString(),
  }));

  const started = await apiRequest<ProviderStartResponse>(`/v1/profiles/${encodeURIComponent(targetProfileId)}/imports/start`, {
    method: 'POST',
    body: jsonBody({ provider, action: 'connect' }),
  });

  if (started.authUrl) {
    window.location.assign(started.authUrl);
    return;
  }

  window.location.assign(sanitizeReturnTo(intent.returnTo) ?? '/dashboard');
}

export function clearPendingProviderAuth(): void {
  window.sessionStorage.removeItem(PENDING_PROVIDER_AUTH_STORAGE_KEY);
}

export async function beginTraktAuth(intent: ProviderAuthIntent = {}): Promise<void> {
  await beginProviderAuth('trakt', intent);
}

export async function beginSimklAuth(intent: ProviderAuthIntent = {}): Promise<void> {
  await beginProviderAuth('simkl', intent);
}

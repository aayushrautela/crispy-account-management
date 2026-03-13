import { mapSupabaseError } from '../lib/errors';
import { StorageService } from '../lib/storage';
import { supabase } from '../lib/supabase';
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

export interface ProviderAuthPayload {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string | null;
  scope: string | null;
  expiresAt: string | null;
  connectedAt: string;
  providerUserId: string | null;
  providerUsername: string | null;
  raw: Record<string, unknown>;
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

export interface OnboardingContext {
  householdId: string;
  userId: string;
}

export interface ProviderAuthIntent {
  targetProfileId?: string;
  returnTo?: string;
}

interface ProfileDataRow {
  profile_id: string;
  settings: unknown;
  trakt_auth: unknown;
  simkl_auth: unknown;
}

interface PendingTraktAuthSession {
  provider: 'trakt';
  state: string;
  codeVerifier: string;
  redirectUri: string;
  targetProfileId: string | null;
  returnTo: string | null;
  createdAt: string;
}

export interface SimklPinSession {
  provider: 'simkl';
  userCode: string;
  verificationUrl: string;
  intervalSeconds: number;
  expiresAt: string;
  targetProfileId: string | null;
  returnTo: string | null;
  createdAt: string;
}

export interface CompletedProviderAuthResult {
  auth: ProviderAuthPayload;
  targetProfileId: string | null;
  returnTo: string | null;
}

const DEFAULT_PROFILE_NAME = 'Main Profile';
const PENDING_PROVIDER_AUTH_STORAGE_KEY = 'crispy.pending-provider-auth';
const DEFAULT_SIMKL_VERIFICATION_URL = 'https://simkl.com/pin/';

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

  let onboarding: OnboardingSettingsRecord['onboarding'];

  if (isRecord(value.onboarding)) {
    // Legacy nested format (should no longer be written)
    const selectedService = parseSyncService(value.onboarding.selectedService);

    onboarding = {
      ...(selectedService ? { selectedService } : {}),
      ...(typeof value.onboarding.completedAt === 'string' ? { completedAt: value.onboarding.completedAt } : {}),
      ...(typeof value.onboarding.updatedAt === 'string' ? { updatedAt: value.onboarding.updatedAt } : {}),
    };
  } else {
    // Flat string-map format (current)
    const selectedService = parseSyncService(value['onboarding.selectedService']);

    onboarding = {
      ...(selectedService ? { selectedService } : {}),
      ...(typeof value['onboarding.completedAt'] === 'string'
        ? { completedAt: value['onboarding.completedAt'] as string }
        : {}),
      ...(typeof value['onboarding.updatedAt'] === 'string'
        ? { updatedAt: value['onboarding.updatedAt'] as string }
        : {}),
    };
  }

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

function hasProviderToken(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const accessToken = value.accessToken;
  return typeof accessToken === 'string' && accessToken.length > 0;
}

/**
 * Convert a ProviderAuthPayload into a flat Record<string, string>
 * that satisfies the is_string_map() CHECK constraint on profile_data columns.
 */
function serializeAuthPayload(payload: ProviderAuthPayload): Record<string, string> {
  const map: Record<string, string> = {};
  if (payload.accessToken) map.accessToken = payload.accessToken;
  if (payload.refreshToken) map.refreshToken = payload.refreshToken;
  if (payload.expiresAt) map.expiresAt = payload.expiresAt;
  map.updatedAt = String(Date.now());
  if (payload.providerUsername) map.userHandle = payload.providerUsername;
  if (payload.providerUserId) map.providerUserId = payload.providerUserId;
  return map;
}

function sanitizeReturnTo(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.startsWith('/') ? trimmed : null;
}

function buildOnboardingState(profileId: string | null, row: ProfileDataRow | null): OnboardingState {
  const settings = parseSettings(row?.settings);
  const selectedService = settings.onboarding?.selectedService ?? settings.syncProvider ?? null;
  const traktConnected = hasProviderToken(row?.trakt_auth);
  const simklConnected = hasProviderToken(row?.simkl_auth);

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
    openRouterConfigured: Boolean(settings.openRouter?.configuredAt),
  };
}

async function ensureOnboardingProfile(context: OnboardingContext): Promise<Profile> {
  const profiles = await listProfiles(context.householdId);
  const primaryProfile = await getPrimaryProfile(context.householdId, profiles);

  if (primaryProfile) {
    StorageService.setActiveProfileId(context.householdId, primaryProfile.id);
    return primaryProfile;
  }

  const sortedProfiles = sortProfilesByPrimaryRule(profiles);

  if (sortedProfiles[0]) {
    StorageService.setActiveProfileId(context.householdId, sortedProfiles[0].id);
    return sortedProfiles[0];
  }

  const profile = await createProfile({
    householdId: context.householdId,
    userId: context.userId,
    name: DEFAULT_PROFILE_NAME,
    avatar: null,
  });

  StorageService.setActiveProfileId(context.householdId, profile.id);
  return profile;
}

async function loadProfileData(profileId: string): Promise<ProfileDataRow | null> {
  const profileDataTable = supabase.from('profile_data') as never as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: ProfileDataRow | null; error: unknown }>;
      };
    };
  };

  const { data, error } = await profileDataTable
    .select('profile_id, settings, trakt_auth, simkl_auth')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to load onboarding settings.'));
  }

  return data;
}

async function saveProfileData(
  profileId: string,
  updates: Partial<Pick<ProfileDataRow, 'settings' | 'trakt_auth' | 'simkl_auth'>>,
): Promise<void> {
  const existingRow = await loadProfileData(profileId);
  const profileDataTable = supabase.from('profile_data') as never as {
    upsert: (
      values: {
        profile_id: string;
        settings: unknown;
        trakt_auth: unknown;
        simkl_auth: unknown;
      },
      options: { onConflict: string },
    ) => Promise<{ error: unknown }>;
  };

  const { error } = await profileDataTable.upsert(
    {
      profile_id: profileId,
      settings: updates.settings ?? existingRow?.settings ?? {},
      trakt_auth: updates.trakt_auth ?? existingRow?.trakt_auth ?? {},
      simkl_auth: updates.simkl_auth ?? existingRow?.simkl_auth ?? {},
    },
    { onConflict: 'profile_id' },
  );

  if (error) {
    throw new Error(mapSupabaseError(error, 'Failed to save onboarding settings.'));
  }
}

function mergeSettings(base: unknown, service: SyncService, markComplete = false): Record<string, string> {
  // Preserve existing flat string-map entries
  const map: Record<string, string> = {};
  if (isRecord(base)) {
    for (const [k, v] of Object.entries(base)) {
      if (typeof v === 'string') map[k] = v;
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

export async function getOnboardingState(context: OnboardingContext): Promise<OnboardingState> {
  const profile = await ensureOnboardingProfile(context);
  const row = await loadProfileData(profile.id);
  return buildOnboardingState(profile.id, row);
}

export async function getProfileOnboardingState(profileId: string): Promise<OnboardingState> {
  const row = await loadProfileData(profileId);
  return buildOnboardingState(profileId, row);
}

export async function listProfileOnboardingStates(profileIds: string[]): Promise<Record<string, OnboardingState>> {
  const entries = await Promise.all(
    profileIds.map(async (profileId) => [profileId, await getProfileOnboardingState(profileId)] as const),
  );

  return Object.fromEntries(entries);
}

export async function setSelectedSyncService(
  context: OnboardingContext,
  service: SyncService,
): Promise<OnboardingState> {
  const profile = await ensureOnboardingProfile(context);
  const row = await loadProfileData(profile.id);

  await saveProfileData(profile.id, {
    settings: mergeSettings(row?.settings, service),
  });

  return getOnboardingState(context);
}

export async function saveProviderAuth(
  context: OnboardingContext,
  service: SyncService,
  payload: ProviderAuthPayload,
): Promise<OnboardingState> {
  const profile = await ensureOnboardingProfile(context);
  await saveProviderAuthForProfile(profile.id, service, payload);

  return getOnboardingState(context);
}

export async function saveProviderAuthForProfile(
  profileId: string,
  service: SyncService,
  payload: ProviderAuthPayload,
): Promise<OnboardingState> {
  const row = await loadProfileData(profileId);
  const serializedAuth = serializeAuthPayload(payload);

  await saveProfileData(profileId, {
    settings: mergeSettings(row?.settings, service, true),
    trakt_auth: service === 'trakt' ? serializedAuth : row?.trakt_auth,
    simkl_auth: service === 'simkl' ? serializedAuth : row?.simkl_auth,
  });

  return getProfileOnboardingState(profileId);
}

function getRequiredEnvVar(value: string | undefined, label: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  throw new Error(`${label} is not configured.`);
}

function createRandomString(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return toBase64Url(digest);
}

function savePendingProviderAuth(session: PendingTraktAuthSession | SimklPinSession): void {
  window.sessionStorage.setItem(PENDING_PROVIDER_AUTH_STORAGE_KEY, JSON.stringify(session));
}

function readPendingProviderAuth(): PendingTraktAuthSession | SimklPinSession | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_PROVIDER_AUTH_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (parsed.provider === 'trakt') {
      return {
        provider: 'trakt',
        state: typeof parsed.state === 'string' ? parsed.state : '',
        codeVerifier: typeof parsed.codeVerifier === 'string' ? parsed.codeVerifier : '',
        redirectUri: typeof parsed.redirectUri === 'string' ? parsed.redirectUri : '',
        targetProfileId: typeof parsed.targetProfileId === 'string' ? parsed.targetProfileId : null,
        returnTo: sanitizeReturnTo(typeof parsed.returnTo === 'string' ? parsed.returnTo : undefined),
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
      };
    }

    if (parsed.provider === 'simkl') {
      return {
        provider: 'simkl',
        userCode: typeof parsed.userCode === 'string' ? parsed.userCode : '',
        verificationUrl: typeof parsed.verificationUrl === 'string' ? parsed.verificationUrl : DEFAULT_SIMKL_VERIFICATION_URL,
        intervalSeconds: typeof parsed.intervalSeconds === 'number' ? parsed.intervalSeconds : 5,
        expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : '',
        targetProfileId: typeof parsed.targetProfileId === 'string' ? parsed.targetProfileId : null,
        returnTo: sanitizeReturnTo(typeof parsed.returnTo === 'string' ? parsed.returnTo : undefined),
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function clearPendingProviderAuth(): void {
  window.sessionStorage.removeItem(PENDING_PROVIDER_AUTH_STORAGE_KEY);
}

export function getPendingSimklPinSession(): SimklPinSession | null {
  const pending = readPendingProviderAuth();

  if (pending?.provider !== 'simkl') {
    return null;
  }

  return pending;
}

export async function beginTraktAuth(intent: ProviderAuthIntent = {}): Promise<void> {
  const clientId = getRequiredEnvVar(import.meta.env.VITE_TRAKT_CLIENT_ID, 'VITE_TRAKT_CLIENT_ID');
  const redirectUri =
    import.meta.env.VITE_TRAKT_REDIRECT_URI?.trim() || `${window.location.origin}/auth/connect/trakt`;
  const state = createRandomString();
  const codeVerifier = createRandomString(48);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  savePendingProviderAuth({
    provider: 'trakt',
    state,
    codeVerifier,
    redirectUri,
    targetProfileId: intent.targetProfileId ?? null,
    returnTo: sanitizeReturnTo(intent.returnTo),
    createdAt: new Date().toISOString(),
  });

  const authorizeUrl = new URL('https://trakt.tv/oauth/authorize');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  window.location.assign(authorizeUrl.toString());
}

async function fetchTraktProfile(accessToken: string, clientId: string): Promise<{ providerUserId: string | null; providerUsername: string | null }> {
  const response = await fetch('https://api.trakt.tv/users/settings', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'trakt-api-key': clientId,
      'trakt-api-version': '2',
    },
  });

  if (!response.ok) {
    return {
      providerUserId: null,
      providerUsername: null,
    };
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const user = isRecord(payload.user) ? payload.user : null;
  const ids = user && isRecord(user.ids) ? user.ids : null;
  const username = user && typeof user.username === 'string' ? user.username : null;
  const slug = ids && typeof ids.slug === 'string' ? ids.slug : null;

  return {
    providerUserId: slug,
    providerUsername: username,
  };
}

function buildProviderAuthPayload(
  rawPayload: Record<string, unknown>,
  profile: { providerUserId: string | null; providerUsername: string | null },
): ProviderAuthPayload {
  const expiresIn = typeof rawPayload.expires_in === 'number' ? rawPayload.expires_in : null;

  return {
    accessToken: typeof rawPayload.access_token === 'string' ? rawPayload.access_token : '',
    refreshToken: typeof rawPayload.refresh_token === 'string' ? rawPayload.refresh_token : null,
    tokenType: typeof rawPayload.token_type === 'string' ? rawPayload.token_type : null,
    scope: typeof rawPayload.scope === 'string' ? rawPayload.scope : null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    connectedAt: new Date().toISOString(),
    providerUserId: profile.providerUserId,
    providerUsername: profile.providerUsername,
    raw: rawPayload,
  };
}

export async function completeTraktAuthCallback(searchParams: URLSearchParams): Promise<CompletedProviderAuthResult> {
  const pending = readPendingProviderAuth();

  if (!pending || pending.provider !== 'trakt') {
    throw new Error('Trakt sign-in session expired. Please try again.');
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const providerError = searchParams.get('error');

  if (providerError) {
    clearPendingProviderAuth();
    throw new Error(searchParams.get('error_description') ?? 'Trakt authorization was cancelled.');
  }

  if (!code || !state || state !== pending.state) {
    clearPendingProviderAuth();
    throw new Error('Trakt authorization response could not be verified.');
  }

  const clientId = getRequiredEnvVar(import.meta.env.VITE_TRAKT_CLIENT_ID, 'VITE_TRAKT_CLIENT_ID');
  const response = await fetch('https://api.trakt.tv/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-key': clientId,
      'trakt-api-version': '2',
    },
    body: JSON.stringify({
      code,
      client_id: clientId,
      code_verifier: pending.codeVerifier,
      redirect_uri: pending.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !payload || typeof payload.access_token !== 'string') {
    clearPendingProviderAuth();
    throw new Error(
      typeof payload?.error_description === 'string'
        ? payload.error_description
        : 'Unable to finish Trakt authorization.',
    );
  }

  clearPendingProviderAuth();

  const profile = await fetchTraktProfile(payload.access_token, clientId);
  return {
    auth: buildProviderAuthPayload(payload, profile),
    targetProfileId: pending.targetProfileId,
    returnTo: pending.returnTo,
  };
}

export async function beginSimklAuth(intent: ProviderAuthIntent = {}): Promise<SimklPinSession> {
  const clientId = getRequiredEnvVar(import.meta.env.VITE_SIMKL_CLIENT_ID, 'VITE_SIMKL_CLIENT_ID');
  const response = await fetch(`https://api.simkl.com/oauth/pin?client_id=${encodeURIComponent(clientId)}`);
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !payload || typeof payload.user_code !== 'string') {
    throw new Error(
      typeof payload?.error === 'string' ? payload.error : 'Unable to start SIMKL authorization.',
    );
  }

  const intervalSeconds = typeof payload.interval === 'number' ? payload.interval : 5;
  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 900;
  const session: SimklPinSession = {
    provider: 'simkl',
    userCode: payload.user_code,
    verificationUrl:
      typeof payload.verification_url === 'string' ? payload.verification_url : DEFAULT_SIMKL_VERIFICATION_URL,
    intervalSeconds,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    targetProfileId: intent.targetProfileId ?? null,
    returnTo: sanitizeReturnTo(intent.returnTo),
    createdAt: new Date().toISOString(),
  };

  savePendingProviderAuth(session);
  return session;
}

export type SimklPollResult =
  | { status: 'pending'; intervalSeconds: number; targetProfileId: string | null; returnTo: string | null }
  | { status: 'complete'; auth: ProviderAuthPayload; targetProfileId: string | null; returnTo: string | null };

export async function pollSimklAuth(): Promise<SimklPollResult> {
  const pending = readPendingProviderAuth();

  if (!pending || pending.provider !== 'simkl') {
    throw new Error('SIMKL sign-in session expired. Please start again.');
  }

  if (Date.parse(pending.expiresAt) <= Date.now()) {
    clearPendingProviderAuth();
    throw new Error('SIMKL sign-in code expired. Please start again.');
  }

  const clientId = getRequiredEnvVar(import.meta.env.VITE_SIMKL_CLIENT_ID, 'VITE_SIMKL_CLIENT_ID');
  const response = await fetch(
    `https://api.simkl.com/oauth/pin/${encodeURIComponent(pending.userCode)}?client_id=${encodeURIComponent(clientId)}`,
  );
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !payload) {
    throw new Error('Unable to verify SIMKL authorization right now.');
  }

  if (payload.result === 'OK' && typeof payload.access_token === 'string') {
    clearPendingProviderAuth();
    return {
      status: 'complete',
      auth: buildProviderAuthPayload(payload, {
        providerUserId: null,
        providerUsername: null,
      }),
      targetProfileId: pending.targetProfileId,
      returnTo: pending.returnTo,
    };
  }

  const errorMessage = typeof payload.error === 'string' ? payload.error : null;

  if (errorMessage === 'expired_token' || errorMessage === 'bad_verification_code') {
    clearPendingProviderAuth();
    throw new Error('SIMKL sign-in code expired. Please start again.');
  }

  return {
    status: 'pending',
    intervalSeconds: pending.intervalSeconds,
    targetProfileId: pending.targetProfileId,
    returnTo: pending.returnTo,
  };
}

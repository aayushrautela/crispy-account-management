import { jsonBody, apiRequest } from '../lib/apiClient';

export interface Addon {
  url: string;
  enabled: boolean;
  name: string | null;
}

interface AccountSettingsResponse {
  settings: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAddons(value: unknown): Addon[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.url !== 'string') {
      return [];
    }

    return [{
      url: item.url,
      enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
      name: typeof item.name === 'string' ? item.name : null,
    }];
  });
}

async function getAccountSettings(): Promise<Record<string, unknown>> {
  const data = await apiRequest<AccountSettingsResponse>('/v1/account/settings');
  return data.settings;
}

export async function getAccountAddons(): Promise<Addon[]> {
  const settings = await getAccountSettings();
  return parseAddons(settings.addons);
}

export async function replaceAccountAddons(addons: Addon[]): Promise<void> {
  await apiRequest<AccountSettingsResponse>('/v1/account/settings', {
    method: 'PATCH',
    body: jsonBody({ addons }),
  });
}

export async function addAddon(url: string): Promise<void> {
  const addons = await getAccountAddons();

  let normalizedUrl = url.trim();
  if (normalizedUrl.startsWith('stremio://')) {
    normalizedUrl = normalizedUrl.replace('stremio://', 'https://');
  } else if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  if (addons.some((addon) => addon.url === normalizedUrl)) {
    return;
  }

  const newAddons = [...addons, { url: normalizedUrl, enabled: true, name: null }];
  await replaceAccountAddons(newAddons);
}

export async function removeAddon(url: string): Promise<void> {
  const addons = await getAccountAddons();
  const newAddons = addons.filter((addon) => addon.url !== url);
  await replaceAccountAddons(newAddons);
}

export async function toggleAddon(url: string): Promise<void> {
  const addons = await getAccountAddons();
  const newAddons = addons.map((addon) =>
    addon.url === url ? { ...addon, enabled: !addon.enabled } : addon,
  );
  await replaceAccountAddons(newAddons);
}

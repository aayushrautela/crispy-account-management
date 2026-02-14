import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Plus, Puzzle, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import {
  addAddon,
  getHouseholdAddons,
  removeAddon,
  toggleAddon,
  type Addon,
} from '../../services/addonService';
import { mapSupabaseError } from '../../lib/errors';
import { cn } from '../../lib/utils';

interface SectionMessage {
  type: 'success' | 'error';
  text: string;
}

interface ManifestDetails {
  name?: string;
  description?: string;
  logo?: string;
  icon?: string;
  version?: string;
}

interface AddonRowProps {
  addon: Addon;
  busy: boolean;
  onToggle: (url: string) => Promise<void>;
  onRemove: (url: string) => Promise<void>;
}

function resolveIconUrl(icon: string | undefined, manifestUrl: string): string | null {
  if (!icon) {
    return null;
  }

  if (icon.startsWith('http://') || icon.startsWith('https://')) {
    return icon;
  }

  if (icon.startsWith('//')) {
    return `https:${icon}`;
  }

  try {
    return new URL(icon, manifestUrl).toString();
  } catch {
    return null;
  }
}

function AddonRow({ addon, busy, onToggle, onRemove }: AddonRowProps) {
  const [details, setDetails] = useState<ManifestDetails | null>(null);
  const [failed, setFailed] = useState(false);
  const [useFallbackIcon, setUseFallbackIcon] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchManifest = async () => {
      setDetails(null);
      setFailed(false);
      setUseFallbackIcon(false);

      try {
        const response = await fetch(addon.url);
        if (!response.ok) {
          throw new Error('Failed to fetch manifest');
        }

        const manifest = (await response.json()) as ManifestDetails;
        if (!mounted) {
          return;
        }

        setDetails(manifest);
      } catch {
        if (mounted) {
          setFailed(true);
        }
      }
    };

    void fetchManifest();

    return () => {
      mounted = false;
    };
  }, [addon.url]);

  const manifestIconUrl = resolveIconUrl(details?.logo ?? details?.icon, addon.url);
  const fallbackIconUrl = resolveIconUrl('/favicon.ico', addon.url);
  const iconUrl = useFallbackIcon ? fallbackIconUrl : manifestIconUrl ?? fallbackIconUrl;

  const title = details?.name ?? addon.name ?? addon.url;
  const subtitle = details?.description ?? addon.url;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border border-stone-700 bg-stone-800/40 p-3 transition-opacity',
        !addon.enabled && 'opacity-60',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={title}
            className="h-10 w-10 rounded-md object-cover"
            onError={() => setUseFallbackIcon(true)}
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center text-stone-500">
            {failed ? <AlertCircle className="h-4 w-4 text-amber-400" /> : <Puzzle className="h-4 w-4" />}
          </div>
        )}

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{title}</div>
          <div className="truncate text-xs text-stone-400">{subtitle}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={addon.enabled}
          aria-label={addon.enabled ? 'Disable addon' : 'Enable addon'}
          disabled={busy}
          onClick={() => {
            void onToggle(addon.url);
          }}
          className={cn(
            'relative inline-flex h-7 w-12 items-center rounded-full border transition-colors',
            addon.enabled
              ? 'border-amber-500/70 bg-amber-500/25'
              : 'border-stone-600 bg-stone-700/90',
            busy && 'cursor-not-allowed opacity-50',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
              addon.enabled ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            void onRemove(addon.url);
          }}
          className="h-8 w-8 rounded-lg p-0 text-stone-400 hover:bg-red-500/10 hover:text-red-400"
          aria-label="Remove addon"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Addons() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newAddonUrl, setNewAddonUrl] = useState('');
  const [message, setMessage] = useState<SectionMessage | null>(null);
  const [busyUrls, setBusyUrls] = useState<Set<string>>(new Set());

  const loadAddons = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getHouseholdAddons();
      setAddons(data);
    } catch (error) {
      setMessage({ type: 'error', text: mapSupabaseError(error, 'Failed to load addons.') });
      setAddons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddons();
  }, [loadAddons]);

  const setBusy = (url: string, busy: boolean) => {
    setBusyUrls((current) => {
      const next = new Set(current);
      if (busy) {
        next.add(url);
      } else {
        next.delete(url);
      }
      return next;
    });
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!newAddonUrl.trim()) {
      return;
    }

    setAdding(true);
    setMessage(null);

    try {
      await addAddon(newAddonUrl);
      await loadAddons();
      setNewAddonUrl('');
      setMessage({ type: 'success', text: 'Addon saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: mapSupabaseError(error, 'Failed to add addon.') });
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (url: string) => {
    setBusy(url, true);

    try {
      await toggleAddon(url);
      setAddons((current) =>
        current.map((addon) =>
          addon.url === url ? { ...addon, enabled: !addon.enabled } : addon,
        ),
      );
    } catch (error) {
      setMessage({ type: 'error', text: mapSupabaseError(error, 'Failed to update addon.') });
    } finally {
      setBusy(url, false);
    }
  };

  const handleRemove = async (url: string) => {
    setBusy(url, true);

    try {
      await removeAddon(url);
      setAddons((current) => current.filter((addon) => addon.url !== url));
    } catch (error) {
      setMessage({ type: 'error', text: mapSupabaseError(error, 'Failed to remove addon.') });
    } finally {
      setBusy(url, false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Addons</h1>
        <p className="mt-0.5 text-sm text-stone-500">Install and manage household addons.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            id="addon-url"
            label="Addon manifest URL"
            placeholder="https://example.com/manifest.json"
            value={newAddonUrl}
            onChange={(event) => setNewAddonUrl(event.target.value)}
            disabled={adding}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-stone-500">Supports `https://` and `stremio://` links.</p>
            <Button type="submit" isLoading={adding} disabled={!newAddonUrl.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add addon
            </Button>
          </div>
        </form>

        {message && (
          <div
            className={cn(
              'mt-4 rounded-lg border p-3 text-sm',
              message.type === 'success'
                ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                : 'border-red-500/20 bg-red-500/10 text-red-400',
            )}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 border-t border-stone-800/70 pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl border border-stone-700 bg-stone-800/30" />
              ))}
            </div>
          ) : addons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/30 py-10 text-center">
              <Puzzle className="mx-auto h-7 w-7 text-stone-500" />
              <p className="mt-3 text-sm font-medium text-stone-300">No addons installed</p>
              <p className="mt-1 text-xs text-stone-500">Add a manifest URL above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addons.map((addon) => (
                <AddonRow
                  key={addon.url}
                  addon={addon}
                  busy={busyUrls.has(addon.url)}
                  onToggle={handleToggle}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

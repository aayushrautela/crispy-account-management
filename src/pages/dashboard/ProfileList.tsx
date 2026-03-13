import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ProfileForm } from '../../components/ProfileForm';
import { useAuthStore } from '../../store/useAuthStore';
import type { Profile } from '../../types';
import { resolveAvatarUrl } from '../../lib/avatar';
import { mapSupabaseError } from '../../lib/errors';
import { listProfileOnboardingStates, type OnboardingState, type SyncService } from '../../services/onboardingService';
import {
  createProfile,
  deleteProfile,
  getPrimaryProfile,
  listProfiles,
  sortProfilesByPrimaryRule,
  updateProfile,
} from '../../services/profileService';
import traktLogo from '../../assets/brands/trakt.svg';
import simklLogo from '../../assets/brands/simkl.svg';

type ProfileRecord = Profile & { last_active_at?: string | null };

const serviceMeta: Record<Exclude<SyncService, null>, { label: string; logo: string; description: string }> = {
  trakt: {
    label: 'Trakt',
    logo: traktLogo,
    description: 'Sync watch history and lists with Trakt for this profile.',
  },
  simkl: {
    label: 'SIMKL',
    logo: simklLogo,
    description: 'Use SIMKL instead when this profile tracks a separate library there.',
  },
};

function formatLastActive(value: string | null | undefined): string {
  if (!value) {
    return 'No recent activity';
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return 'Recently active';
  }

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < 5 * minute) {
    return 'Active just now';
  }

  if (diffMs < hour) {
    return `Last active ${Math.max(1, Math.round(diffMs / minute))}m ago`;
  }

  if (diffMs < day) {
    return `Last active ${Math.max(1, Math.round(diffMs / hour))}h ago`;
  }

  if (diffMs < 2 * day) {
    return 'Last active yesterday';
  }

  return `Last active ${Math.max(2, Math.round(diffMs / day))}d ago`;
}

function ServiceBadge({ service }: { service: SyncService | null }) {
  if (!service) {
    return (
      <span className="inline-flex items-center text-sm font-medium text-stone-500">
        None
      </span>
    );
  }

  const meta = serviceMeta[service];

  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-stone-300">
      <img src={meta.logo} alt="" className="h-4 w-4" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export default function ProfileList() {
  const navigate = useNavigate();
  const { user, householdId, status } = useAuthStore();
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [profileStates, setProfileStates] = useState<Record<string, OnboardingState>>({});
  const [primaryProfileId, setPrimaryProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileRecord | null>(null);
  const [serviceModalProfile, setServiceModalProfile] = useState<ProfileRecord | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<ProfileRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageProfiles = status === 'authenticated' && !!householdId && !!user;

  const fetchProfiles = useCallback(async () => {
    if (!canManageProfiles || !householdId) {
      setProfiles([]);
      setProfileStates({});
      setPrimaryProfileId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = (await listProfiles(householdId)) as ProfileRecord[];
      const sortedProfiles = sortProfilesByPrimaryRule(result) as ProfileRecord[];
      setProfiles(sortedProfiles);
      setProfileStates(await listProfileOnboardingStates(sortedProfiles.map((profile) => profile.id)));

      const primaryProfile = await getPrimaryProfile(householdId, sortedProfiles);
      setPrimaryProfileId(primaryProfile?.id ?? null);
    } catch (fetchError) {
      setProfileStates({});
      setError(mapSupabaseError(fetchError, 'Failed to load profiles.'));
    } finally {
      setLoading(false);
    }
  }, [canManageProfiles, householdId]);

  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  const handleCreate = async (payload: { name: string; avatar: string | null }) => {
    if (!householdId || !user) {
      throw new Error('Account context is not ready yet.');
    }

    await createProfile({
      householdId,
      userId: user.id,
      name: payload.name,
      avatar: payload.avatar,
    });

    await fetchProfiles();
    setIsModalOpen(false);
    setEditingProfile(null);
  };

  const handleUpdate = async (payload: { name: string; avatar: string | null }) => {
    if (!householdId || !editingProfile) {
      throw new Error('Profile context is missing.');
    }

    await updateProfile({
      householdId,
      profileId: editingProfile.id,
      name: payload.name,
      avatar: payload.avatar,
    });

    await fetchProfiles();
    setIsModalOpen(false);
    setEditingProfile(null);
  };

  const handleConnectService = (profile: ProfileRecord, provider: SyncService) => {
    if (!provider) {
      return;
    }

    setServiceModalProfile(null);
    navigate(
      `/auth/connect/${provider}?targetProfileId=${encodeURIComponent(profile.id)}&returnTo=${encodeURIComponent('/dashboard')}`,
    );
  };

  const handleDelete = async () => {
    if (!householdId || !profileToDelete) {
      return;
    }

    if (profiles.length <= 1) {
      setError('At least one profile must remain in your household.');
      setProfileToDelete(null);
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteProfile(householdId, profileToDelete.id);

      if (serviceModalProfile?.id === profileToDelete.id) {
        setServiceModalProfile(null);
      }

      await fetchProfiles();
      setProfileToDelete(null);
    } catch (deleteError) {
      setError(mapSupabaseError(deleteError, 'Failed to delete profile.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const summary = useMemo(() => {
    const totalProfiles = profiles.length;
    const connectedProfiles = profiles.filter((profile) => profileStates[profile.id]?.connectedService).length;
    const aiReadyProfiles = profiles.filter((profile) => profileStates[profile.id]?.openRouterConfigured).length;

    return {
      totalProfiles,
      connectedProfiles,
      aiReadyProfiles,
    };
  }, [profileStates, profiles]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!canManageProfiles) {
    return (
      <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-5 text-sm text-stone-400">
        Account membership is still loading. Refresh the page if this persists.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-800 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl font-medium text-white">Profiles & connections</h1>
          <p className="text-sm text-stone-500">
            Manage each profile, choose its sync source, and configure OpenRouter keys.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingProfile(null);
            setIsModalOpen(true);
          }}
          className="h-9 px-4 text-sm font-medium"
        >
          <Plus size={16} className="mr-1.5" />
          Add profile
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {profiles.length === 0 && (
            <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-stone-800 bg-stone-950">
                <Users className="h-5 w-5 text-stone-500" />
              </div>
              <h2 className="mt-4 text-sm font-medium text-white">No profiles yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
                Create the first household profile to start syncing watch history and profile-specific AI setup.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {profiles.map((profile) => {
              const avatarUrl = resolveAvatarUrl(profile.avatar);
              const isPrimary = profile.id === primaryProfileId;
              const profileState = profileStates[profile.id];
              const connectedService = profileState?.connectedService ?? null;
              const aiConfigured = profileState?.openRouterConfigured ?? false;

              return (
                <div
                  key={profile.id}
                  className="flex flex-col gap-5 rounded-lg border border-stone-800 bg-stone-900/30 p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-800 bg-stone-950">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-stone-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-medium text-white">{profile.name}</h2>
                        {isPrimary && (
                          <span className="rounded border border-stone-700 bg-stone-800 px-1.5 py-0.5 text-[10px] font-medium text-stone-300">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500">{formatLastActive(profile.last_active_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8 border-t border-stone-800 pt-4 lg:border-t-0 lg:pt-0">
                    <div className="flex items-center gap-6 sm:gap-8 justify-between lg:justify-end w-full sm:w-auto">
                      <div className="flex flex-col items-start w-28">
                        <span className="mb-1 text-xs text-stone-500">Sync Source</span>
                        <ServiceBadge service={connectedService} />
                      </div>

                      <div className="flex flex-col items-start w-24">
                        <span className="mb-1 text-xs text-stone-500">AI Setup</span>
                        <span className="text-sm font-medium text-stone-300">
                          {aiConfigured ? 'Configured' : 'Not added'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => setServiceModalProfile(profile)}>
                        Connections
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingProfile(profile);
                          setIsModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      {!isPrimary && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setProfileToDelete(profile)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-5">
            <h3 className="mb-4 text-sm font-medium text-white">Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">Total profiles</p>
                <p className="text-sm font-medium text-stone-300">{summary.totalProfiles}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">Sync connected</p>
                <p className="text-sm font-medium text-stone-300">{summary.connectedProfiles}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">AI ready</p>
                <p className="text-sm font-medium text-stone-300">{summary.aiReadyProfiles}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-5">
            <h3 className="mb-4 text-sm font-medium text-white">Guide</h3>
            <div className="space-y-3 text-sm text-stone-500">
              <p>Each profile can use one watch-history source at a time (Trakt or SIMKL).</p>
              <p>OpenRouter keys live per profile so one person can use AI without changing everyone else.</p>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProfile(null);
        }}
        title={editingProfile ? 'Edit Profile' : 'Create Profile'}
      >
        <ProfileForm
          initialData={editingProfile ?? undefined}
          onSubmit={editingProfile ? handleUpdate : handleCreate}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingProfile(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={!!serviceModalProfile}
        onClose={() => setServiceModalProfile(null)}
        title={serviceModalProfile ? `${serviceModalProfile.name} Services` : 'Profile Services'}
      >
        {serviceModalProfile && (
          <div className="space-y-4">
            <p className="text-sm text-stone-400">
              Choose the service this profile should use for watch history sync. You can reconnect or switch later.
            </p>

            <div className="space-y-3">
              {(['trakt', 'simkl'] as const).map((provider) => {
                const isConnected =
                  provider === 'trakt'
                    ? profileStates[serviceModalProfile.id]?.traktConnected
                    : profileStates[serviceModalProfile.id]?.simklConnected;

                return (
                  <div key={provider} className="rounded-lg border border-stone-800 bg-stone-900/30 p-5">
                    <div className="flex sm:items-start flex-col sm:flex-row justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-800 bg-stone-950">
                          <img src={serviceMeta[provider].logo} alt="" className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{serviceMeta[provider].label}</p>
                          <p className="mt-1 text-sm text-stone-500">{serviceMeta[provider].description}</p>
                        </div>
                      </div>

                      <div className="flex items-center self-end sm:self-auto gap-2">
                        <span
                          className={`text-sm font-medium ${
                            isConnected ? 'text-emerald-500' : 'text-stone-500'
                          }`}
                        >
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleConnectService(serviceModalProfile, provider)}
                      >
                        {isConnected ? `Reconnect ${serviceMeta[provider].label}` : `Connect ${serviceMeta[provider].label}`}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!profileToDelete}
        onClose={() => setProfileToDelete(null)}
        title="Delete Profile"
      >
        <div className="space-y-4 text-sm">
          <p className="text-stone-300">
            Are you sure you want to delete <span className="font-medium text-white">{profileToDelete?.name}</span>? This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setProfileToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              Delete profile
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

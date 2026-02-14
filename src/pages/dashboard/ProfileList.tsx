import { useCallback, useEffect, useState } from 'react';
import { Edit2, Loader2, Plus, Trash2, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ProfileForm } from '../../components/ProfileForm';
import { useAuthStore } from '../../store/useAuthStore';
import type { Profile } from '../../types';
import { resolveAvatarUrl } from '../../lib/avatar';
import { mapSupabaseError } from '../../lib/errors';
import {
  createProfile,
  deleteProfile,
  getPrimaryProfile,
  listProfiles,
  sortProfilesByPrimaryRule,
  updateProfile,
} from '../../services/profileService';

export default function ProfileList() {
  const { user, householdId, status } = useAuthStore();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [primaryProfileId, setPrimaryProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageProfiles = status === 'authenticated' && !!householdId && !!user;

  const fetchProfiles = useCallback(async () => {
    if (!canManageProfiles || !householdId) {
      setProfiles([]);
      setPrimaryProfileId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await listProfiles(householdId);
      const sortedProfiles = sortProfilesByPrimaryRule(result);
      setProfiles(sortedProfiles);

      const primaryProfile = await getPrimaryProfile(householdId, sortedProfiles);
      setPrimaryProfileId(primaryProfile?.id ?? null);
    } catch (fetchError) {
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

    const created = await createProfile({
      householdId,
      userId: user.id,
      name: payload.name,
      avatar: payload.avatar,
    });

    const nextProfiles = sortProfilesByPrimaryRule([...profiles, created]);
    setProfiles(nextProfiles);
    setPrimaryProfileId(nextProfiles[0]?.id ?? null);
    setIsModalOpen(false);
    setEditingProfile(null);
  };

  const handleUpdate = async (payload: { name: string; avatar: string | null }) => {
    if (!householdId || !editingProfile) {
      throw new Error('Profile context is missing.');
    }

    const updated = await updateProfile({
      householdId,
      profileId: editingProfile.id,
      name: payload.name,
      avatar: payload.avatar,
    });

    const nextProfiles = sortProfilesByPrimaryRule(
      profiles.map((profile) => (profile.id === updated.id ? updated : profile)),
    );
    setProfiles(nextProfiles);
    setPrimaryProfileId(nextProfiles[0]?.id ?? null);
    setIsModalOpen(false);
    setEditingProfile(null);
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
      const nextProfiles = profiles.filter((profile) => profile.id !== profileToDelete.id);
      setProfiles(nextProfiles);
      setPrimaryProfileId(nextProfiles[0]?.id ?? null);
      setProfileToDelete(null);
    } catch (deleteError) {
      setError(mapSupabaseError(deleteError, 'Failed to delete profile.'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!canManageProfiles) {
    return (
      <div className="rounded-2xl border border-stone-700 bg-stone-800/50 p-6 text-sm text-stone-300">
        Account membership is still loading. Refresh the page if this persists.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Profiles</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Manage profile identities inside your household.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingProfile(null);
            setIsModalOpen(true);
          }}
          size="sm"
          className="h-9 w-full px-4 font-semibold md:w-auto"
        >
          <Plus size={18} className="mr-1.5" />
          Add Profile
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {profiles.map((profile) => {
          const avatarUrl = resolveAvatarUrl(profile.avatar);
          const isPrimary = profile.id === primaryProfileId;

          return (
            <div
              key={profile.id}
              className="group flex items-center justify-between rounded-2xl border border-stone-600 bg-stone-800 p-4 shadow-xl shadow-black/10 transition-all hover:border-stone-500 hover:bg-stone-700"
            >
              <div className="min-w-0 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-700/50 bg-stone-800/50 shadow-inner">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    <User size={28} className="text-stone-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-white">{profile.name}</h3>
                    {isPrimary && (
                      <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                        Primary
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-stone-600">ID: {profile.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => {
                    setEditingProfile(profile);
                    setIsModalOpen(true);
                  }}
                  className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-800 hover:text-white"
                  title="Profile Settings"
                >
                  <Edit2 size={18} />
                </button>
                {!isPrimary && (
                  <button
                    onClick={() => setProfileToDelete(profile)}
                    className="rounded-lg p-2 text-red-400/80 transition-colors hover:bg-red-400/10 hover:text-red-400"
                    title="Delete Profile"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {profiles.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-700/50 bg-stone-800/30 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-800/50">
              <User size={24} className="text-stone-600" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-white">No profiles yet</h2>
            <p className="mx-auto max-w-[260px] text-sm text-stone-500">
              Create a profile to start tracking preferences for your household.
            </p>
          </div>
        )}
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
        isOpen={!!profileToDelete}
        onClose={() => setProfileToDelete(null)}
        title="Delete Profile"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-stone-300">
            Are you sure you want to delete <strong>{profileToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex flex-col justify-end gap-3 md:flex-row">
            <Button variant="ghost" className="w-full md:w-auto" onClick={() => setProfileToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="w-full md:w-auto"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete Profile
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

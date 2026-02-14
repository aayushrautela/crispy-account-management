import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AvatarPicker } from './AvatarPicker';
import type { Profile } from '../types';
import { getRandomDiceBearUrl, resolveAvatarUrl } from '../lib/avatar';
import { mapSupabaseError } from '../lib/errors';
import { profileNameSchema } from '../contracts';

interface ProfileFormProps {
  initialData?: Profile;
  onSubmit: (payload: { name: string; avatar: string | null }) => Promise<void>;
  onCancel: () => void;
}

export function ProfileForm({ initialData, onSubmit, onCancel }: ProfileFormProps) {
  const initialAvatar = useMemo(() => {
    const resolved = resolveAvatarUrl(initialData?.avatar ?? null);
    return resolved ?? getRandomDiceBearUrl();
  }, [initialData?.avatar]);

  const [name, setName] = useState(initialData?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const parsedName = profileNameSchema.parse(name);
      const avatar = avatarUrl.trim() ? avatarUrl.trim() : null;

      await onSubmit({ name: parsedName, avatar });
    } catch (submissionError) {
      if (submissionError instanceof z.ZodError) {
        setError(submissionError.issues[0]?.message ?? 'Invalid profile form values.');
      } else {
        setError(mapSupabaseError(submissionError, 'Failed to save profile.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
      </div>

      <Input
        label="Profile Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Enter profile name"
        maxLength={32}
        required
      />

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-stone-800 pt-4 md:flex-row md:justify-end">
        <Button
          type="button"
          variant="ghost"
          className="w-full md:w-auto"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" className="w-full md:w-auto" isLoading={loading}>
          {initialData ? 'Save Changes' : 'Create Profile'}
        </Button>
      </div>
    </form>
  );
}

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AvatarPicker } from './AvatarPicker';
import type { Profile } from '../types';
import { getRandomDiceBearUrl, resolveAvatarUrl } from '../lib/avatar';
import { useAuthStore } from '../store/useAuthStore';

interface ProfileFormProps {
  initialData?: Profile;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const { user } = useAuthStore();
  const [name, setName] = useState(initialData?.name || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(
    initialData?.avatar ? (resolveAvatarUrl(initialData.avatar) || getRandomDiceBearUrl()) : getRandomDiceBearUrl()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      if (initialData) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ name, avatar: avatarUrl, updated_at: new Date().toISOString() })
          .eq('id', initialData.id);

        if (updateError) throw updateError;
      } else {
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('order_index')
          .eq('account_id', user.id)
          .order('order_index', { ascending: false })
          .limit(1);

        const nextOrderIndex = (existingProfiles?.[0]?.order_index ?? -1) + 1;

        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            account_id: user.id,
            name,
            avatar: avatarUrl,
            order_index: nextOrderIndex,
          });

        if (createError) throw createError;
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <AvatarPicker
          value={avatarUrl}
          onChange={setAvatarUrl}
        />
      </div>

      <div className="space-y-4">
        <Input
          label="Profile Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter profile name"
          required
        />
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-end gap-3 pt-4 border-t border-stone-800">
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
};

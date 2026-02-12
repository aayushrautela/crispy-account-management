import React, { useState, useRef } from 'react';
import { Camera, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { uploadAvatar } from '../lib/storage';
import type { Profile } from '../types';
import { useAuthStore } from '../store/useAuthStore';

interface ProfileFormProps {
  initialData?: Profile;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const { user } = useAuthStore();
  const [name, setName] = useState(initialData?.name || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let avatarUrl = initialData?.avatar || null;

      if (avatarFile) {
        const url = await uploadAvatar(avatarFile, user.id);
        if (url) {
          avatarUrl = url;
        } else {
            throw new Error('Failed to upload avatar');
        }
      }

      if (initialData) {
        // Update
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ name, avatar: avatarUrl })
          .eq('id', initialData.id);

        if (updateError) throw updateError;
      } else {
        // Create
        // First get the current max order_index
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
            order_index: nextOrderIndex
          });

        if (createError) throw createError;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-4">
        <div 
          className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 hover:border-blue-500 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <UserIcon size={32} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        <p className="text-sm text-gray-400">Click to change avatar</p>
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

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={loading}>
          {initialData ? 'Save Changes' : 'Create Profile'}
        </Button>
      </div>
    </form>
  );
};

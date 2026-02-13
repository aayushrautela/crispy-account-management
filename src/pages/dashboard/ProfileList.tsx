import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, User, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import type { Profile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ProfileForm } from '../../components/ProfileForm';

export default function ProfileList() {
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  
  // Delete confirmation
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

  const fetchProfiles = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_id', user.id)
        .order('order_index');
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [user]);

  const handleOpenCreate = () => {
    setEditingProfile(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!profileToDelete) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileToDelete.id);

      if (error) throw error;
      
      setProfiles(profiles.filter(p => p.id !== profileToDelete.id));
      setProfileToDelete(null);
    } catch (error) {
      console.error('Error deleting profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Profiles</h1>
          <p className="text-sm text-stone-500 mt-0.5">Manage your viewing identities and preferences.</p>
        </div>
        <Button onClick={handleOpenCreate} size="sm" className="w-full md:w-auto h-9 px-4 font-semibold">
          <Plus size={18} className="mr-1.5" />
          Add Profile
        </Button>
      </div>

      <div className="space-y-3">
        {profiles.map((profile, index) => (
          <div 
            key={profile.id} 
            className="flex items-center justify-between p-4 bg-stone-800 border border-stone-600 rounded-2xl hover:border-stone-500 hover:bg-stone-700 transition-all group shadow-xl shadow-black/10"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-stone-800/50 border border-stone-700/50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={28} className="text-stone-500" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white truncate">{profile.name}</h3>
                  {index === 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[10px] font-bold text-blue-400 uppercase tracking-wide border border-blue-500/20">
                      Primary
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-stone-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-green-500" />
                    Active
                  </span>
                  <span className="text-[10px] text-stone-600 font-mono">
                    ID: {profile.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleOpenEdit(profile)}
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
                title="Profile Settings"
              >
                <Edit2 size={18} />
              </button>
              {index !== 0 && (
                <button 
                  onClick={() => setProfileToDelete(profile)}
                  className="p-2 text-red-400/80 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Delete Profile"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}

        {profiles.length === 0 && (
          <div className="py-16 text-center bg-stone-800/30 border border-dashed border-stone-700/50 rounded-2xl flex flex-col items-center">
            <div className="w-12 h-12 bg-stone-800/50 rounded-xl flex items-center justify-center mb-4">
              <User size={24} className="text-stone-600" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">No profiles yet</h2>
            <p className="text-sm text-stone-500 max-w-[240px] mx-auto">Create a profile to start tracking your viewing history.</p>
            <Button onClick={handleOpenCreate} variant="outline" size="sm" className="w-full md:w-auto mt-6">
              <Plus size={16} className="mr-1.5" />
              Create First Profile
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProfile ? "Edit Profile" : "Create Profile"}
      >
          <ProfileForm
            initialData={editingProfile || undefined}
            onSuccess={() => {
            setIsModalOpen(false);
            fetchProfiles();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
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
          <div className="flex flex-col md:flex-row justify-end gap-3">
            <Button variant="ghost" className="w-full md:w-auto" onClick={() => setProfileToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" className="w-full md:w-auto" onClick={handleDelete}>
              Delete Profile
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

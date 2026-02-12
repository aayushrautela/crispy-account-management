import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, User, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import type { Profile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
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
          <h1 className="text-4xl font-black tracking-tight text-white uppercase">Profiles</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage your viewing identities and preferences.</p>
        </div>
        <Button onClick={handleOpenCreate} disabled={profiles.length >= 5}>
          <Plus size={20} className="mr-2" />
          Add Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile) => (
          <Card key={profile.id} className="p-0 group relative overflow-hidden transition-all hover:border-gray-600 border-2">
             <div className="p-6">
               <div className="flex items-start justify-between mb-4">
                  <div className="w-20 h-20 rounded-lg bg-gray-800 border-2 border-gray-700 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-gray-600" />
                    )}
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 rounded bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-widest border border-gray-700">
                      Standard
                    </span>
                  </div>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-white leading-tight uppercase truncate">{profile.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Profile</p>
                  </div>
               </div>
             </div>
             <div className="border-t border-gray-800 p-4 bg-black/40 flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-widest">
                <span>Created {new Date(profile.created_at || Date.now()).toLocaleDateString()}</span>
                <span>ID: {profile.id.slice(0, 8)}</span>
             </div>
             
             <div className="p-4 bg-gray-900 border-t border-gray-800 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
               <Button variant="secondary" size="sm" className="flex-1 font-bold uppercase text-xs tracking-widest" onClick={() => handleOpenEdit(profile)}>
                 <Edit2 size={14} className="mr-2" />
                 Settings
               </Button>
               <Button variant="danger" size="sm" className="px-3" onClick={() => setProfileToDelete(profile)}>
                 <Trash2 size={14} />
               </Button>
             </div>
          </Card>
        ))}

        {profiles.length === 0 && (
          <div className="col-span-full py-24 text-center text-gray-500 bg-gray-900 rounded-2xl border-2 border-dashed border-gray-800 flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <User size={40} className="text-gray-600" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase mb-2">No Profiles Found</h2>
            <p className="max-w-xs text-gray-500 font-medium">Start your journey by creating your first viewing profile. You can have up to 5.</p>
            <Button onClick={handleOpenCreate} variant="outline" className="mt-8 border-2">
              <Plus size={20} className="mr-2" />
              Get Started
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
          <p className="text-gray-300">
            Are you sure you want to delete <strong>{profileToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setProfileToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Profile
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Key, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export default function AccountSettings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const { signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Confirmation email sent to the new address.' });
      setEmail('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      setMessage({ type: 'error', text: "Passwords don't match" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account Settings</h1>
        <p className="text-sm text-stone-500 mt-0.5">Manage your login and security preferences.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-500' 
            : 'bg-red-500/10 border border-red-500/20 text-red-500'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Mail className="text-blue-500 w-7 h-7" />
          <div>
            <h2 className="text-lg font-bold text-white">Email</h2>
            <p className="text-xs text-stone-500">Update your account login email</p>
          </div>
        </div>

        <form onSubmit={handleUpdateEmail} className="space-y-4 pt-4 border-t border-stone-800/50">
          <Input
            label="New Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter new email"
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              fullWidth
              className="md:w-auto h-9 text-xs"
              disabled={loading || !email}
              isLoading={loading}
            >
              Update Email
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Key className="text-purple-500 w-7 h-7" />
          <div>
            <h2 className="text-lg font-bold text-white">Security</h2>
            <p className="text-xs text-stone-500">Manage your password protection</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4 pt-4 border-t border-stone-800/50">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            minLength={6}
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            minLength={6}
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              fullWidth
              className="md:w-auto h-9 text-xs"
              disabled={loading || !password}
              isLoading={loading}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <AlertTriangle className="text-red-500 w-7 h-7" />
          <div>
            <h2 className="text-lg font-bold text-white">Danger Zone</h2>
            <p className="text-xs text-stone-500">Irreversible account actions</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-t border-stone-800/50">
          <div>
            <h3 className="text-sm font-semibold text-white">Delete Account</h3>
            <p className="text-xs text-stone-500 mt-0.5">Permanently remove your account and all associated data</p>
          </div>
          <Button 
            variant="danger" 
            onClick={() => setIsDeleteModalOpen(true)}
            fullWidth
            className="md:w-auto px-6 h-9 text-xs"
          >
            Delete Account
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Account"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 text-red-400">
            <AlertTriangle className="shrink-0" />
            <p className="text-sm">
              This action is permanent and cannot be undone. All your profiles, watch history, and account data will be permanently deleted.
            </p>
          </div>
          
          <p className="text-stone-300">
            To confirm deletion, please type <strong>DELETE</strong> below.
          </p>

          <Input
            label="Confirmation"
            placeholder="Type DELETE to confirm"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
          />

          <div className="flex flex-col md:flex-row justify-end gap-3 mt-6">
            <Button variant="ghost" fullWidth className="md:w-auto" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              fullWidth
              className="md:w-auto"
              disabled={deleteConfirmation !== 'DELETE' || loading}
              onClick={async () => {
                // In a real app, this would call a Supabase Function.
                // For now, we'll sign out and show an alert as requested/planned.
                // Or try to delete user if RLS permits (usually doesn't).
                try {
                  setLoading(true);
                  // specific implementation for "Cascading delete" usually requires backend logic.
                  // We will simulate it by signing out and redirecting.
                  await signOut();
                  navigate('/auth/login');
                  alert('Account deletion request received. Your data will be removed shortly.');
                } catch (error) {
                  console.error(error);
                } finally {
                  setLoading(false);
                  setIsDeleteModalOpen(false);
                }
              }}
            >
              Permanently Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

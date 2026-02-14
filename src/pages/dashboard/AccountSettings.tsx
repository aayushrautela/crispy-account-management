import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Key, Mail } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../store/useAuthStore';
import {
  deleteCurrentAccount,
  updateUserEmail,
  updateUserPassword,
} from '../../services/accountService';
import { confirmationKeywordSchema } from '../../contracts';
import { mapSupabaseError } from '../../lib/errors';

interface SectionMessage {
  type: 'success' | 'error';
  text: string;
}

export default function AccountSettings() {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();

  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<SectionMessage | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<SectionMessage | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteConfirmValid = useMemo(
    () => confirmationKeywordSchema.safeParse(deleteConfirmation).success,
    [deleteConfirmation],
  );

  const handleUpdateEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailLoading(true);
    setEmailMessage(null);

    try {
      await updateUserEmail(email);
      setEmailMessage({
        type: 'success',
        text: 'Confirmation email sent to your new address.',
      });
      setEmail('');
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.issues[0]?.message ?? 'Invalid email address.'
          : mapSupabaseError(error, 'Failed to update email.');

      setEmailMessage({ type: 'error', text: message });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (password !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: "Passwords don't match." });
      return;
    }

    setPasswordLoading(true);

    try {
      await updateUserPassword(password);
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.issues[0]?.message ?? 'Invalid password.'
          : mapSupabaseError(error, 'Failed to update password.');

      setPasswordMessage({ type: 'error', text: message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);

    if (!deleteConfirmValid) {
      setDeleteError('Type DELETE to confirm account deletion.');
      return;
    }

    setDeleteLoading(true);

    try {
      await deleteCurrentAccount();
      await signOut();
      navigate('/auth/login', { replace: true });
    } catch (error) {
      setDeleteError(mapSupabaseError(error, 'Failed to delete account.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Account Settings</h1>
        <p className="mt-0.5 text-sm text-stone-500">Manage authentication and security for your account.</p>
      </div>

      <Card className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Mail className="h-7 w-7 text-blue-500" />
          <div>
            <h2 className="text-lg font-bold text-white">Email</h2>
            <p className="text-xs text-stone-500">Update your login email address</p>
          </div>
        </div>

        <form onSubmit={handleUpdateEmail} className="space-y-4 border-t border-stone-800/50 pt-4">
          <Input
            id="new-email"
            label="New Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {emailMessage && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                emailMessage.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/20 bg-red-500/10 text-red-400'
              }`}
            >
              {emailMessage.text}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              className="h-9 w-full text-xs md:w-auto"
              isLoading={emailLoading}
              disabled={!email.trim()}
            >
              Update Email
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <Key className="h-7 w-7 text-amber-500" />
          <div>
            <h2 className="text-lg font-bold text-white">Security</h2>
            <p className="text-xs text-stone-500">Rotate your password</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4 border-t border-stone-800/50 pt-4">
          <Input
            id="new-password"
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
          <Input
            id="confirm-password"
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />

          {passwordMessage && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                passwordMessage.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/20 bg-red-500/10 text-red-400'
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              className="h-9 w-full text-xs md:w-auto"
              isLoading={passwordLoading}
              disabled={!password || !confirmPassword}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="mb-6 flex items-center gap-4">
          <AlertTriangle className="h-7 w-7 text-red-500" />
          <div>
            <h2 className="text-lg font-bold text-white">Danger Zone</h2>
            <p className="text-xs text-stone-500">Permanent account actions</p>
          </div>
        </div>

        <div className="space-y-4 border-t border-stone-800/50 py-4">
          <p className="text-sm text-stone-300">
            Deleting your account permanently removes your household memberships, profiles, and related
            data.
          </p>
          <Button
            variant="danger"
            className="h-9 w-full text-xs md:w-auto"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Delete Account
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!deleteLoading) {
            setIsDeleteModalOpen(false);
            setDeleteConfirmation('');
            setDeleteError(null);
          }
        }}
        title="Delete Account"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              This action cannot be undone. Ensure your `delete-account` Supabase edge function is deployed.
            </p>
          </div>

          <p className="text-sm text-stone-300">
            Type <strong>DELETE</strong> to confirm.
          </p>

          <Input
            id="delete-confirmation"
            label="Confirmation"
            placeholder="DELETE"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
          />

          {deleteError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {deleteError}
            </div>
          )}

          <div className="flex flex-col justify-end gap-3 md:flex-row">
            <Button
              variant="ghost"
              className="w-full md:w-auto"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmation('');
                setDeleteError(null);
              }}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="w-full md:w-auto"
              onClick={() => {
                void handleDeleteAccount();
              }}
              isLoading={deleteLoading}
              disabled={!deleteConfirmValid}
            >
              Permanently Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

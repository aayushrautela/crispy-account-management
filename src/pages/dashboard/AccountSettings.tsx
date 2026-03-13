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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-800 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl font-medium text-white">Account Settings</h1>
          <p className="text-sm text-stone-500">Manage authentication and security for your account.</p>
        </div>
      </div>

      <Card className="p-0 border-none bg-transparent">
        <div className="mb-4 flex items-center gap-3">
          <Mail className="h-5 w-5 text-stone-500" />
          <div>
            <h2 className="text-sm font-medium text-white">Email</h2>
            <p className="text-xs text-stone-500">Update your login email address</p>
          </div>
        </div>

        <form onSubmit={handleUpdateEmail} className="space-y-4 rounded-lg border border-stone-800 bg-stone-900/30 p-5">
          <Input
            id="new-email"
            name="newEmail"
            label="New Email Address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {emailMessage && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                emailMessage.type === 'success'
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
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

      <Card className="p-0 border-none bg-transparent">
        <div className="mb-4 flex items-center gap-3">
          <Key className="h-5 w-5 text-stone-500" />
          <div>
            <h2 className="text-sm font-medium text-white">Security</h2>
            <p className="text-xs text-stone-500">Rotate your password</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4 rounded-lg border border-stone-800 bg-stone-900/30 p-5">
          <Input
            id="new-password"
            name="newPassword"
            label="New Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
          <Input
            id="confirm-password"
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
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
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
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

      <Card className="p-0 border-none bg-transparent">
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <div>
            <h2 className="text-sm font-medium text-white">Danger Zone</h2>
            <p className="text-xs text-stone-500">Permanent account actions</p>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-red-500/20 bg-red-500/5 p-5">
          <p className="text-sm text-stone-300">
            Deleting your account removes your login and household access. If you are the last owner,
            the household and related profile data are deleted too.
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
              This action cannot be undone. Shared households stay available to other members, but any
              household you solely own is removed with its related data.
            </p>
          </div>

          <p className="text-sm text-stone-300">
            Type <strong>DELETE</strong> to confirm.
          </p>

          <Input
            id="delete-confirmation"
            name="deleteConfirmation"
            label="Confirmation"
            autoComplete="off"
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

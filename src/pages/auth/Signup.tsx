import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { signUpWithEmailPassword } from '../../services/authService';
import { mapSupabaseError } from '../../lib/errors';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const result = await signUpWithEmailPassword(formData.email, formData.password);

      if (result.requiresEmailVerification) {
        setNotice('Check your inbox and confirm your email before signing in.');
        return;
      }

      navigate('/dashboard');
    } catch (signUpError) {
      setError(mapSupabaseError(signUpError, 'Unable to create your account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
        <p className="mt-1 text-sm text-stone-500">Join Crispy and manage your household profiles</p>
      </div>

      <div className="rounded-2xl border border-stone-600 bg-stone-800 p-8 shadow-2xl shadow-black/20">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            minLength={8}
            required
          />
          <Input
            id="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="Repeat your password"
            value={formData.confirmPassword}
            onChange={(event) =>
              setFormData((current) => ({ ...current, confirmPassword: event.target.value }))
            }
            minLength={8}
            required
          />

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {notice && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              {notice}
            </div>
          )}

          <Button type="submit" className="mt-2 h-11 w-full font-semibold" isLoading={loading}>
            Sign Up
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-stone-500">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-semibold text-white transition-colors hover:text-stone-300">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

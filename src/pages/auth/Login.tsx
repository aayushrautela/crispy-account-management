import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { signInWithEmailPassword } from '../../services/authService';
import { mapSupabaseError } from '../../lib/errors';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailPassword(formData.email, formData.password);
      navigate('/dashboard');
    } catch (signInError) {
      setError(mapSupabaseError(signInError, 'Unable to sign in.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8 rounded-lg border border-white/5 bg-stone-900 p-8 shadow-sm sm:p-10">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-white">Sign In</h1>
        <p className="text-sm leading-relaxed text-stone-400">Sign in to your account to continue.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          label="Email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
          required
        />
        <div className="space-y-1">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            label="Password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            required
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs font-medium text-stone-400 transition hover:text-white"
              onClick={() => {
                /* TODO: Forgot password flow */
              }}
            >
              Forgot password?
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full font-semibold"
          isLoading={loading}
        >
          Continue
        </Button>
      </form>

      <div className="text-center text-sm text-stone-500">
        Don't have an account?{' '}
        <Link to="/auth/signup" className="font-bold text-white transition-colors hover:text-stone-300">
          Create one
        </Link>
      </div>
    </div>
  );
}

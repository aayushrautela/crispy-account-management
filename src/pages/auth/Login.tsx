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
    <div className="w-full space-y-8 rounded-[32px] border border-white/10 bg-stone-950/40 p-8 shadow-[0_32px_96px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Welcome back</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Sign In</h1>
        <p className="text-sm leading-relaxed text-stone-400">Jump back into Crispy tv and pick up where you left off.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
          className="h-12 rounded-2xl border-white/10 bg-stone-900/50 text-white placeholder:text-stone-500 focus:border-white focus:ring-white/20"
          required
        />
        <div className="space-y-1">
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            className="h-12 rounded-2xl border-white/10 bg-stone-900/50 text-white placeholder:text-stone-500 focus:border-white focus:ring-white/20"
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
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="h-12 w-full rounded-2xl bg-white font-bold text-stone-950 transition-all hover:scale-[1.02] hover:bg-stone-100 active:scale-[0.98]"
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

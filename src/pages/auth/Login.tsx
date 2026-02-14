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
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h1>
        <p className="mt-1 text-sm text-stone-500">Sign in to manage your household account</p>
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
            placeholder="••••••••"
            value={formData.password}
            onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
            required
          />

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <Button type="submit" className="mt-2 h-11 w-full font-semibold" isLoading={loading}>
            Sign In
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-stone-500">
          Don't have an account?{' '}
          <Link to="/auth/signup" className="font-semibold text-white transition-colors hover:text-stone-300">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

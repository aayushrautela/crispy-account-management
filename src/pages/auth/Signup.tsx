import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { mapSupabaseError } from '../../lib/errors';
import { signUpWithEmailPassword } from '../../services/authService';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);
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

    try {
      const result = await signUpWithEmailPassword(formData.email.trim(), formData.password);

      if (result.requiresEmailVerification) {
        setEmailVerificationPending(true);
        return;
      }

      navigate('/auth/onboarding');
    } catch (signUpError) {
      setError(mapSupabaseError(signUpError, 'Unable to create your account.'));
    } finally {
      setLoading(false);
    }
  };

  if (emailVerificationPending) {
    return (
      <div className="w-full space-y-8 rounded-[32px] border border-white/10 bg-stone-950/40 p-8 shadow-[0_32px_96px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
        <div className="space-y-3 text-center sm:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">One more step</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Check your inbox</h1>
          <p className="text-sm leading-relaxed text-stone-400">
            We sent a confirmation link to <span className="font-semibold text-stone-200">{formData.email}</span>. Please verify your email to continue.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/auth/login"
            className="flex h-12 items-center justify-center rounded-2xl bg-white font-bold text-stone-950 transition hover:bg-stone-100"
          >
            Go to Sign In
          </Link>
          <button
            type="button"
            onClick={() => setEmailVerificationPending(false)}
            className="text-sm font-medium text-stone-400 transition hover:text-white"
          >
            Back to Signup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 rounded-[32px] border border-white/10 bg-stone-950/40 p-8 shadow-[0_32px_96px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Get Started</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
        <p className="text-sm leading-relaxed text-stone-400">Start your journey with Crispy tv in just a few seconds.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="email"
          type="email"
          label="Email address"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
          className="h-12 rounded-2xl border-white/10 bg-stone-900/50 text-white placeholder:text-stone-500 focus:border-white focus:ring-white/20"
          required
        />
        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
          className="h-12 rounded-2xl border-white/10 bg-stone-900/50 text-white placeholder:text-stone-500 focus:border-white focus:ring-white/20"
          minLength={8}
          required
        />
        <Input
          id="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="Repeat your password"
          value={formData.confirmPassword}
          onChange={(event) => setFormData((current) => ({ ...current, confirmPassword: event.target.value }))}
          className="h-12 rounded-2xl border-white/10 bg-stone-900/50 text-white placeholder:text-stone-500 focus:border-white focus:ring-white/20"
          minLength={8}
          required
        />

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
          Create Account
        </Button>
      </form>

      <div className="text-center text-sm text-stone-500">
        Already have an account?{' '}
        <Link to="/auth/login" className="font-bold text-white transition-colors hover:text-stone-300">
          Sign in
        </Link>
      </div>
    </div>
  );
}

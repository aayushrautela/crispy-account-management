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
    referralCode: '',
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
      const result = await signUpWithEmailPassword(formData.email.trim(), formData.password, {
        referralCode: formData.referralCode,
      });

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
      <div className="w-full space-y-8 rounded-lg border border-white/5 bg-stone-900 p-8 shadow-xl sm:p-10">
        <div className="space-y-3 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-white">Check your inbox</h1>
          <p className="text-sm leading-relaxed text-stone-400">
            We sent a confirmation link to <span className="font-semibold text-stone-200">{formData.email}</span>. Please verify your email to continue.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/auth/login"
            className="flex h-10 items-center justify-center rounded-lg bg-[#2b6cee] font-semibold text-white transition hover:bg-[#3e7bff]"
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
    <div className="w-full space-y-8 rounded-lg border border-white/5 bg-stone-900 p-8 shadow-sm sm:p-10">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-white">Create Account</h1>
        <p className="text-sm leading-relaxed text-stone-400">Sign up for an account to get started.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          label="Email address"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          label="Password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))}
          minLength={8}
          required
        />
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          label="Confirm password"
          placeholder="Repeat your password"
          value={formData.confirmPassword}
          onChange={(event) => setFormData((current) => ({ ...current, confirmPassword: event.target.value }))}
          minLength={8}
          required
        />
        <Input
          id="referralCode"
          name="referralCode"
          type="text"
          autoComplete="off"
          label="Referral code"
          placeholder="Optional"
          value={formData.referralCode}
          onChange={(event) => setFormData((current) => ({ ...current, referralCode: event.target.value }))}
        />

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

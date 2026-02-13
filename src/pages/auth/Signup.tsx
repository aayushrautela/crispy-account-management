import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;
      
      // Auto login or redirect to login (Supabase default behavior depends on config)
      // Usually signUp with autoConfirm: false requires email verification.
      // Assuming auto-confirm or standard flow for now.
      navigate('/dashboard'); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
        <p className="text-sm text-stone-500 mt-1">Join Crispy today</p>
      </div>

      <div className="p-8 bg-stone-800 border border-stone-600 rounded-2xl shadow-2xl shadow-black/20">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            minLength={6}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <Input
            id="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            minLength={6}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11 font-semibold mt-2" isLoading={loading}>
            Sign Up
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-stone-500">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-semibold text-white hover:text-stone-300 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

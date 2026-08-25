import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    navigate('/');
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border border-line rounded-xl p-8">
        <h1 className="font-display text-2xl font-semibold mb-1">Welcome back</h1>
        <p className="text-muted text-sm mb-6">Sign in to send your campaigns.</p>

        {error && (
          <div className="mb-4 text-sm text-failed bg-failed/10 border border-failed/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm text-muted mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 bg-ink border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <label className="block text-sm text-muted mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 bg-ink border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-medium text-sm rounded-md py-2 transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-sm text-muted mt-4 text-center">
          No account?{' '}
          <Link to="/signup" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}

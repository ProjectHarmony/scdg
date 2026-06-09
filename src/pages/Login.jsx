import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Login({ refreshSession }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) alert(error.message);
    else refreshSession();
  }

  return (
    <main className="page auth-page">
      <form className="auth-card" onSubmit={submit}>
        <ShieldCheck size={42} />
        <h1 className="section-title">
          Admin <span>Login</span>
        </h1>
        <input
          required
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={event => setEmail(event.target.value)}
        />
        <input
          required
          type="password"
          placeholder="Password"
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </main>
  );
}

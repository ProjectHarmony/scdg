import { ShieldCheck } from 'lucide-react';

export function MissingEnv() {
  return (
    <main className="page auth-page">
      <div className="auth-card">
        <ShieldCheck size={42} />
        <h1 className="section-title">
          Supabase <span>Needed</span>
        </h1>
        <p>
          Create `.env` from `.env.example`, add your Supabase URL and anon key,
          then restart `npm run dev`.
        </p>
      </div>
    </main>
  );
}

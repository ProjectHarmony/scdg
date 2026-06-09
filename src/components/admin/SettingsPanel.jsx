import { AdminSectionHeader } from './AdminShell';

export function SettingsPanel({ email }) {
  return (
    <div className="admin-panel">
      <AdminSectionHeader title="Settings" description="Administrative account and site setup notes." />
      <div className="data-card">
        <h3>Admin Account</h3>
        <p><b>Email:</b> {email}</p>
        <p>Admin access is only linked from /administrator_0925 and managed by Supabase Auth + profiles role.</p>
      </div>
    </div>
  );
}

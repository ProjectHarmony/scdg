import { AdminSectionHeader } from './AdminShell';

export function DashboardOverview({ founders, events, players, matches, storeItems }) {
  const stats = [
    ['Total Founders', founders.length],
    ['Active Events', events.filter(item => item.is_active).length],
    ['Total Players', players.length],
    ['Total Match Results', matches.length],
    ['Store Items', storeItems.length],
  ];
  const recentEvents = [...events].slice(0, 3);
  const recentFounders = [...founders].slice(0, 3);
  const recentMatches = [...matches].slice(0, 3);

  return (
    <div className="admin-panel">
      <AdminSectionHeader title="Dashboard Overview" description="Quick snapshot of website content." />
      <div className="admin-stat-grid">
        {stats.map(([label, value]) => (
          <div className="admin-stat-card" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="admin-dashboard-grid">
        <RecentList title="Recently Added Events" items={recentEvents} primary="title" secondary="event_date" />
        <RecentList title="Recently Updated Founders" items={recentFounders} primary="name" secondary="role" />
        <RecentList title="Recent Match Imports" items={recentMatches} primary="match_id" secondary="tournament_name" />
      </div>
    </div>
  );
}

function RecentList({ title, items, primary, secondary }) {
  return (
    <div className="admin-recent-card">
      <h3>{title}</h3>
      {items.length ? items.map(item => (
        <p key={item.id}><b>{item[primary]}</b><span>{item[secondary]}</span></p>
      )) : <p>No recent records.</p>}
    </div>
  );
}

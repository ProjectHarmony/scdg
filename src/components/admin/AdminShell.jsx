import {
  BarChart3,
  CalendarDays,
  Link as LinkIcon,
  Medal,
  Package,
  Settings,
  ShieldCheck,
  Swords,
  Users,
} from 'lucide-react';

const navItems = [
  ['dashboard', 'Dashboard', BarChart3],
  ['founders', 'Founders', ShieldCheck],
  ['events', 'Events', CalendarDays],
  ['players', 'Players / Rankings', Medal],
  ['matches', 'Match Results', Swords],
  ['store', 'Store', Package],
  ['social', 'Social Links', LinkIcon],
  ['settings', 'Settings', Settings],
];

export function AdminShell({ activeTab, setActiveTab, title, email, onLogout, children }) {
  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <button className="admin-logo" onClick={() => setActiveTab('dashboard')}>
          S-CDG CMS
        </button>
        <div className="admin-side-nav">
          {navItems.map(([id, label, Icon]) => (
            <button
              className={activeTab === id ? 'active' : ''}
              key={id}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="section-tag">Admin</div>
            <h1>{title}</h1>
            <p>{email}</p>
          </div>
          <button className="btn-outline" onClick={onLogout}>
            Logout
          </button>
        </header>
        {children}
      </section>
    </main>
  );
}

export function AdminSectionHeader({ title, description, action }) {
  return (
    <div className="admin-section-head">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminModal({ title, children, onClose }) {
  return (
    <div className="modal">
      <div className="admin-modal-card">
        <div className="admin-section-head">
          <h2>{title}</h2>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  return (
    <input
      className="admin-search"
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  );
}

export function EmptyState({ children = 'No records yet.' }) {
  return <div className="empty-state"><p>{children}</p></div>;
}

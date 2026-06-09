import { useState } from 'react';
import { AdminShell } from '../components/admin/AdminShell';
import { DataList } from '../components/admin/DataList';
import { DashboardOverview } from '../components/admin/DashboardOverview';
import { EventCrud } from '../components/admin/EventCrud';
import { FounderCrud } from '../components/admin/FounderCrud';
import { MatchResultsCrud } from '../components/admin/MatchResultsCrud';
import { PlayerCrud } from '../components/admin/PlayerCrud';
import { SettingsPanel } from '../components/admin/SettingsPanel';
import { SocialLinksCrud } from '../components/admin/SocialLinksCrud';
import { StoreCrud } from '../components/admin/StoreCrud';
import { supabase } from '../lib/supabase';

const titles = {
  dashboard: 'Dashboard',
  founders: 'Founders',
  events: 'Events',
  players: 'Players / Rankings',
  matches: 'Match Results',
  store: 'Store',
  social: 'Social Links',
  settings: 'Settings',
};

export function Admin({
  session,
  refreshAll,
  setPage,
  players,
  founders,
  events,
  matches,
  storeItems,
  socialLinks,
  messages,
}) {
  const [tab, setTab] = useState('dashboard');
  const [notice, setNotice] = useState(null);

  function notify(message, type = 'success') {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 3000);
  }

  async function logout() {
    await supabase.auth.signOut();
    setPage('home');
  }

  return (
    <AdminShell
      activeTab={tab}
      setActiveTab={setTab}
      title={titles[tab]}
      email={session?.user?.email}
      onLogout={logout}
    >
      {notice && <div className={`toast ${notice.type}`}>{notice.message}</div>}
      {tab === 'dashboard' && <DashboardOverview founders={founders} events={events} players={players} matches={matches} storeItems={storeItems} />}
      {tab === 'founders' && <FounderCrud items={founders} refreshAll={refreshAll} notify={notify} />}
      {tab === 'events' && <EventCrud items={events} refreshAll={refreshAll} notify={notify} />}
      {tab === 'players' && <PlayerCrud items={players} refreshAll={refreshAll} notify={notify} />}
      {tab === 'matches' && <MatchResultsCrud items={matches} players={players} refreshAll={refreshAll} notify={notify} />}
      {tab === 'store' && <StoreCrud items={storeItems} refreshAll={refreshAll} notify={notify} />}
      {tab === 'social' && <SocialLinksCrud items={socialLinks} refreshAll={refreshAll} notify={notify} />}
      {tab === 'settings' && <SettingsPanel email={session?.user?.email} />}
      {tab === 'messages' && <DataList items={messages} />}
    </AdminShell>
  );
}

import { useEffect, useState } from 'react';
import { MissingEnv } from './components/MissingEnv';
import { Navbar } from './components/Navbar';
import { mapPlayer } from './lib/players';
import { envReady, supabase } from './lib/supabase';
import { Admin } from './pages/Admin';
import { Events } from './pages/Events';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Rankings } from './pages/Rankings';
import { Store } from './pages/Store';

const ADMIN_PATH = '/administrator_0925';

export function App() {
  const showAdminLink = window.location.pathname === ADMIN_PATH;
  const [page, setPage] = useState(showAdminLink ? 'admin' : 'home');
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [founders, setFounders] = useState([]);
  const [events, setEvents] = useState([]);
  const [matches, setMatches] = useState([]);
  const [storeItems, setStoreItems] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(envReady);
  const [error, setError] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const publicFounders = founders.filter(item => item.is_active);
  const publicEvents = events
    .filter(item => item.is_active && (!item.event_date || item.event_date >= today))
    .sort((a, b) => String(a.event_date || '').localeCompare(String(b.event_date || '')));
  const publicPlayers = players
    .filter(item => item.isActive)
    .sort((a, b) => b.mmr - a.mmr || b.wins - a.wins || b.matchesPlayed - a.matchesPlayed);

  async function refreshSession() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  }

  async function refreshAll() {
    if (!envReady) return;
    setLoading(true);
    setError('');

    const [playersResult, foundersResult, eventsResult, matchesResult, storeResult, socialResult] = await Promise.all([
      supabase.from('players').select('*').order('created_at', { ascending: false }),
      supabase.from('founders').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      supabase.from('match_results').select('*').order('created_at', { ascending: false }),
      supabase.from('store_items').select('*').order('created_at', { ascending: false }),
      supabase.from('social_links').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true }),
    ]);

    const firstError = playersResult.error || foundersResult.error || eventsResult.error || matchesResult.error || storeResult.error || socialResult.error;
    if (firstError) {
      setError('Content could not be loaded. Please check the Supabase schema setup.');
      setLoading(false);
      return;
    }

    setPlayers((playersResult.data || []).map(mapPlayer));
    setFounders(foundersResult.data || []);
    setEvents(eventsResult.data || []);
    setMatches(matchesResult.data || []);
    setStoreItems(storeResult.data || []);
    setSocialLinks(socialResult.data || []);

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setLoading(false);
      return;
    }

    const messagesResult = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!messagesResult.error) setMessages(messagesResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!envReady) return undefined;

    refreshSession();
    refreshAll();
    const { data } = supabase.auth.onAuthStateChange(() => {
      refreshSession();
      refreshAll();
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <>
      <Navbar
        page={page}
        setPage={setPage}
      />
      {page === 'home' && (
        <Landing
          players={publicPlayers}
          founders={publicFounders}
          storeItems={storeItems.filter(item => item.is_active)}
          socialLinks={socialLinks.filter(item => item.is_active)}
          loading={loading}
          error={error}
          setPage={setPage}
        />
      )}
      {page === 'rankings' && <Rankings players={publicPlayers} loading={loading} error={error} />}
      {page === 'events' && <Events events={publicEvents} loading={loading} error={error} />}
      {page === 'store' && <Store products={storeItems.filter(item => item.is_active)} loading={loading} error={error} />}
      {page === 'admin' &&
        (!envReady ? (
          <MissingEnv />
        ) : session ? (
          <Admin
            session={session}
            refreshAll={refreshAll}
            setPage={setPage}
            players={players}
            founders={founders}
            events={events}
            matches={matches}
            storeItems={storeItems}
            socialLinks={socialLinks}
            messages={messages}
          />
        ) : (
          <Login refreshSession={refreshSession} />
        ))}
      <footer>Copyright 2026 S-CDG Bladers. All rights reserved.</footer>
    </>
  );
}

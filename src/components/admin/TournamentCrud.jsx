import { useEffect, useState } from 'react';
import { Download, Link2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AdminModal, AdminSectionHeader, EmptyState } from './AdminShell';

async function functionErrorMessage(error, fallback) {
  try {
    const payload = await error?.context?.json();
    return payload?.error || error?.message || fallback;
  } catch {
    return error?.message || fallback;
  }
}

export function TournamentCrud({ notify = () => {} }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tournament, setTournament] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [connection, setConnection] = useState(null);
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  async function loadTournaments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('scoring_tournaments')
      .select('id,name,challonge_tournament_id,challonge_scope,challonge_community_id,current_round,status,updated_at')
      .order('updated_at', { ascending: false });
    if (error) notify(error.message, 'error');
    else setItems(data || []);
    setLoading(false);
  }

  async function loadConnection() {
    const { data } = await supabase.rpc('get_challonge_connection_status');
    const nextConnection = data?.[0] || { connected: false };
    setConnection(nextConnection);
    if (nextConnection.connected) loadAvailableTournaments();
  }

  async function loadAvailableTournaments() {
    setListLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('challonge-list-tournaments', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAvailableTournaments(data?.tournaments || []);
      if (data?.warnings?.length) {
        notify('Reconnect Challonge to authorize Community tournaments.', 'error');
      }
    } catch (error) {
      notify(await functionErrorMessage(error, 'Could not load Challonge tournaments.'), 'error');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    loadTournaments();
    loadConnection();
    const params = new URLSearchParams(window.location.search);
    if (params.get('challonge') === 'connected') notify('Challonge connected.');
    if (params.get('challonge') === 'error') notify(params.get('message') || 'Challonge connection failed.', 'error');
    if (params.has('challonge')) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  async function connectChallonge() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('challonge-oauth-start', {
        body: { returnUrl: window.location.href },
      });
      if (error) throw error;
      if (!data?.authorizationUrl) throw new Error(data?.error || 'Authorization URL was not returned.');
      setAuthorizationUrl(data.authorizationUrl);
      notify('Authorization is ready. Continue to Challonge.');
    } catch (error) {
      notify(await functionErrorMessage(error, 'Could not connect Challonge.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function importTournament(event, reference = tournament, referenceCommunityId = communityId) {
    event?.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('challonge-import', {
        body: { tournament: reference, communityId: referenceCommunityId || '' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      notify(`Imported ${data.participants} players and ${data.matches} matches.`);
      setTournament('');
      setCommunityId('');
      setModalOpen(false);
      await loadTournaments();
    } catch (error) {
      notify(await functionErrorMessage(error, 'Tournament import failed.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-panel">
      <AdminSectionHeader
        title="Scoring Tournaments"
        description="Import Swiss participants and matches from Challonge. Scores belong to players, not individual Beys."
        action={(
          <div className="admin-row-actions">
            {authorizationUrl ? (
              <a className="btn-outline" href={authorizationUrl}>
                <Link2 size={16} /> Continue to Challonge
              </a>
            ) : (
              <button className="btn-outline" disabled={busy} onClick={connectChallonge}>
                <Link2 size={16} /> {connection?.connected
                  ? `Reconnect ${connection.username || 'Challonge'}`
                  : 'Connect Challonge'}
              </button>
            )}
            <button
              className="btn-primary"
              disabled={!connection?.connected}
              onClick={() => {
                setModalOpen(true);
                loadAvailableTournaments();
              }}
            ><Download size={16} /> Import</button>
          </div>
        )}
      />

      {loading ? <p className="admin-loading">Loading tournaments...</p> : !items.length ? (
        <EmptyState>No Challonge tournaments imported yet.</EmptyState>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Tournament</th><th>Challonge ID</th><th>Round</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.challonge_tournament_id}</td>
                  <td>{item.current_round}</td>
                  <td>{item.status}</td>
                  <td>
                    <button
                      className="btn-outline"
                      disabled={busy || Number(item.challonge_tournament_id) < 0}
                      onClick={() => importTournament(
                        null,
                        String(item.challonge_tournament_id),
                        item.challonge_community_id || '',
                      )}
                    >
                      <RefreshCw size={15} /> Refresh
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <AdminModal title="Import Challonge Tournament" onClose={() => setModalOpen(false)}>
          <form className="admin-form" onSubmit={importTournament}>
            <label>
              Ongoing Swiss tournament
              <select
                value={availableTournaments.some(item => (
                  item.id === tournament && (item.communityId || '') === communityId
                )) ? `${encodeURIComponent(communityId)}|${tournament}` : ''}
                onChange={event => {
                  const [encodedCommunity = '', id = ''] = event.target.value.split('|');
                  setCommunityId(decodeURIComponent(encodedCommunity));
                  setTournament(id);
                }}
                disabled={listLoading}
              >
                <option value="">{listLoading ? 'Loading from Challonge...' : 'Select a tournament'}</option>
                {availableTournaments.map(item => (
                  <option
                    key={`${item.communityId || 'user'}:${item.id}`}
                    value={`${encodeURIComponent(item.communityId || '')}|${item.id}`}
                  >
                    {item.name}{item.communityId ? ` (${item.communityId})` : ''}
                  </option>
                ))}
              </select>
            </label>
            {!listLoading && !availableTournaments.length && (
              <p className="form-note">No ongoing Swiss tournament was returned by Challonge. You can still paste its URL or ID below.</p>
            )}
            <label>
              Or paste Challonge URL, slug, or tournament ID
              <input
                autoFocus
                placeholder="https://challonge.com/your-tournament"
                value={tournament}
                onChange={event => setTournament(event.target.value)}
              />
            </label>
            <label>
              Community identifier (only for Community tournaments)
              <input
                placeholder="e.g. scdgbladers"
                value={communityId}
                onChange={event => setCommunityId(event.target.value.trim())}
              />
            </label>
            <p className="form-note">Swiss only for this phase. Imported open matches are assigned to your admin account for testing.</p>
            <button className="btn-primary" disabled={busy || !tournament}>{busy ? 'Importing...' : 'Import Tournament'}</button>
          </form>
        </AdminModal>
      )}
    </div>
  );
}

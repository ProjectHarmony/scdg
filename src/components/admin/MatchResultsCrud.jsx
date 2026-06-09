import { useMemo, useState } from 'react';
import { Pencil, Plus, RefreshCcw, Trash2, Upload } from 'lucide-react';
import { AdminModal, AdminSectionHeader, EmptyState, SearchBox } from './AdminShell';
import { supabase } from '../../lib/supabase';

const emptyMatch = {
  tournament_name: '',
  match_id: '',
  player_1: '',
  player_2: '',
  winner: '',
  score: '',
  match_date: '',
};

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const [headerLine, ...rows] = lines;
  const headers = headerLine.split(',').map(item => item.trim());
  return rows.map(line => {
    const values = line.split(',').map(item => item.trim());
    return headers.reduce((record, header, index) => ({ ...record, [header]: values[index] || '' }), {});
  });
}

export function MatchResultsCrud({ items, players, refreshAll, notify }) {
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyMatch);
  const [editingId, setEditingId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState('');

  const filtered = useMemo(() => items.filter(item =>
    `${item.tournament_name} ${item.match_id} ${item.player_1} ${item.player_2}`.toLowerCase().includes(query.toLowerCase())
  ), [items, query]);

  async function save(event) {
    event.preventDefault();
    const request = editingId
      ? supabase.from('match_results').update(form).eq('id', editingId)
      : supabase.from('match_results').insert(form);
    const { error } = await request;
    if (error) notify(error.message, 'error');
    else { notify('Match result saved.'); setModalOpen(false); await refreshAll(); }
  }

  async function remove(item) {
    if (!confirm(`Delete match ${item.match_id}?`)) return;
    const { error } = await supabase.from('match_results').delete().eq('id', item.id);
    if (error) notify(error.message, 'error');
    else { notify('Match deleted.'); refreshAll(); }
  }

  async function importCsv(file) {
    if (!file) return;
    const records = parseCsv(await file.text()).filter(row => row.match_id);
    const existingIds = new Set(items.map(item => item.match_id));
    const fresh = records.filter(row => !existingIds.has(row.match_id));
    const skipped = records.length - fresh.length;
    if (fresh.length) {
      const { error } = await supabase.from('match_results').insert(fresh);
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }
    setImportSummary(`Imported ${fresh.length}. Skipped ${skipped} duplicate match_id values.`);
    notify('CSV import complete.');
    refreshAll();
  }

  async function recalculateRankings() {
    const stats = new Map(players.map(player => [player.name, { ...player, wins: 0, losses: 0, matches_played: 0, mmr: 1000 }]));
    items.forEach(match => {
      [match.player_1, match.player_2].forEach(name => {
        if (!stats.has(name)) stats.set(name, { name, image_url: '', wins: 0, losses: 0, matches_played: 0, mmr: 1000, is_active: true });
      });
      const p1 = stats.get(match.player_1);
      const p2 = stats.get(match.player_2);
      p1.matches_played += 1;
      p2.matches_played += 1;
      if (match.winner === match.player_1) {
        p1.wins += 1; p2.losses += 1; p1.mmr += 25; p2.mmr = Math.max(0, p2.mmr - 15);
      } else if (match.winner === match.player_2) {
        p2.wins += 1; p1.losses += 1; p2.mmr += 25; p1.mmr = Math.max(0, p1.mmr - 15);
      }
    });

    for (const player of stats.values()) {
      const payload = {
        name: player.name,
        image_url: player.image_url || '',
        wins: player.wins,
        losses: player.losses,
        matches_played: player.matches_played,
        mmr: player.mmr,
        is_active: player.is_active ?? true,
      };
      const existing = players.find(item => item.name === player.name);
      const request = existing
        ? supabase.from('players').update(payload).eq('id', existing.id)
        : supabase.from('players').insert(payload);
      const { error } = await request;
      if (error) {
        notify(error.message, 'error');
        return;
      }
    }
    notify('Rankings recalculated.');
    refreshAll();
  }

  return (
    <div className="admin-panel">
      <AdminSectionHeader
        title="Match Results"
        description="Import CSV or manage match history manually."
        action={<div className="admin-row-actions"><label className="btn-outline"><Upload size={16} /> Import CSV<input className="hidden-input" type="file" accept=".csv,text/csv" onChange={event => importCsv(event.target.files[0])} /></label><button className="btn-primary" onClick={() => { setForm(emptyMatch); setEditingId(''); setModalOpen(true); }}><Plus size={16} /> Add Match</button><button className="btn-outline" onClick={recalculateRankings}><RefreshCcw size={16} /> Recalculate</button></div>}
      />
      {importSummary && <div className="status-card">{importSummary}</div>}
      <SearchBox value={query} onChange={setQuery} placeholder="Search matches..." />
      {!filtered.length ? <EmptyState>No match results found.</EmptyState> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Match ID</th><th>Tournament</th><th>Players</th><th>Winner</th><th>Date</th><th>Actions</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td>{item.match_id}</td><td>{item.tournament_name}</td><td>{item.player_1} vs {item.player_2}</td><td>{item.winner}</td><td>{item.match_date}</td><td><div className="admin-row-actions"><button className="btn-outline" onClick={() => { setForm(item); setEditingId(item.id); setModalOpen(true); }}><Pencil size={15} /> Edit</button><button className="btn-outline" onClick={() => remove(item)}><Trash2 size={15} /> Delete</button></div></td></tr>)}</tbody></table></div>}
      {modalOpen && <AdminModal title={editingId ? 'Edit Match Result' : 'Add Match Result'} onClose={() => setModalOpen(false)}><form className="admin-form" onSubmit={save}>
        <input placeholder="Tournament name" value={form.tournament_name} onChange={event => setForm({ ...form, tournament_name: event.target.value })} />
        <input required placeholder="Unique match_id" value={form.match_id} onChange={event => setForm({ ...form, match_id: event.target.value })} />
        <input required placeholder="Player 1" value={form.player_1} onChange={event => setForm({ ...form, player_1: event.target.value })} />
        <input required placeholder="Player 2" value={form.player_2} onChange={event => setForm({ ...form, player_2: event.target.value })} />
        <input required placeholder="Winner" value={form.winner} onChange={event => setForm({ ...form, winner: event.target.value })} />
        <input placeholder="Score" value={form.score} onChange={event => setForm({ ...form, score: event.target.value })} />
        <input type="date" value={form.match_date || ''} onChange={event => setForm({ ...form, match_date: event.target.value })} />
        <button className="btn-primary">Save</button>
      </form></AdminModal>}
    </div>
  );
}

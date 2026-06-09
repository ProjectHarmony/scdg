import { useMemo, useState } from 'react';
import { ImagePlus, Pencil, Trash2, Upload } from 'lucide-react';
import { AdminModal, AdminSectionHeader, EmptyState, SearchBox } from './AdminShell';
import { uploadMedia } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const emptyPlayer = {
  name: '',
  image_url: '',
  image_file: null,
  mmr: 1000,
  wins: 0,
  losses: 0,
  matches_played: 0,
  is_active: true,
};

function toForm(item = emptyPlayer) {
  return { ...emptyPlayer, ...item, image_file: null };
}

export function PlayerCrud({ items, refreshAll, notify }) {
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyPlayer);
  const [editingId, setEditingId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => items.filter(item =>
    item.name?.toLowerCase().includes(query.toLowerCase())
  ), [items, query]);

  function openNew() {
    setEditingId('');
    setForm(emptyPlayer);
    setModalOpen(true);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const uploadedUrl = await uploadMedia(form.image_file);
      const payload = {
        name: form.name,
        image_url: uploadedUrl || form.image_url,
        mmr: Number(form.mmr) || 0,
        wins: Number(form.wins) || 0,
        losses: Number(form.losses) || 0,
        matches_played: Number(form.matches_played) || 0,
        is_active: form.is_active,
      };
      const request = editingId
        ? supabase.from('players').update(payload).eq('id', editingId)
        : supabase.from('players').insert(payload);
      const { error } = await request;
      if (error) throw error;
      setEditingId('');
      setForm(emptyPlayer);
      setModalOpen(false);
      notify('Player saved.');
      await refreshAll();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Delete ${item.name}?`)) return;
    const { error } = await supabase.from('players').delete().eq('id', item.id);
    if (error) notify(error.message, 'error');
    else {
      notify('Player deleted.');
      refreshAll();
    }
  }

  return (
    <div className="admin-panel">
      <AdminSectionHeader
        title="Players / Rankings"
        description="Manage active ranking records shown on the public site."
        action={<button className="btn-primary" onClick={openNew}><ImagePlus size={16} /> Add Player</button>}
      />
      <SearchBox value={query} onChange={setQuery} placeholder="Search players..." />
      {!filtered.length ? <EmptyState>No players found.</EmptyState> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>MMR</th><th>W</th><th>L</th><th>Matches</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.mmr}</td>
                  <td>{item.wins}</td>
                  <td>{item.losses}</td>
                  <td>{item.matches_played}</td>
                  <td>{item.is_active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn-outline" onClick={() => { setEditingId(item.id); setForm(toForm(item)); setModalOpen(true); }}><Pencil size={15} /> Edit</button>
                      <button className="btn-outline" onClick={() => remove(item)}><Trash2 size={15} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modalOpen && (
        <AdminModal title={editingId ? 'Edit Player' : 'Add Player'} onClose={() => { setEditingId(''); setForm(emptyPlayer); setModalOpen(false); }}>
          <form className="admin-form" onSubmit={save}>
            <input required placeholder="Name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
            <input placeholder="Image URL" value={form.image_url} onChange={event => setForm({ ...form, image_url: event.target.value })} />
            <input type="number" placeholder="MMR" value={form.mmr} onChange={event => setForm({ ...form, mmr: Number(event.target.value) })} />
            <input type="number" placeholder="Wins" value={form.wins} onChange={event => setForm({ ...form, wins: Number(event.target.value) })} />
            <input type="number" placeholder="Losses" value={form.losses} onChange={event => setForm({ ...form, losses: Number(event.target.value) })} />
            <input type="number" placeholder="Matches played" value={form.matches_played} onChange={event => setForm({ ...form, matches_played: Number(event.target.value) })} />
            <label className="toggle-label"><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} /> Active</label>
            <label className="file-label"><Upload size={16} /> Upload Image<input type="file" accept="image/*" onChange={event => setForm({ ...form, image_file: event.target.files[0] })} /></label>
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
          </form>
        </AdminModal>
      )}
    </div>
  );
}

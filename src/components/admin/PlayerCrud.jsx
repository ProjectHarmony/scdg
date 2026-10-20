import { useMemo, useState } from 'react';
import { ImagePlus, Pencil, Trash2, Upload } from 'lucide-react';
import { AdminModal, AdminSectionHeader, EmptyState, SearchBox } from './AdminShell';
import { uploadMedia } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const emptyPlayer = {
  name: '',
  image_url: '',
  image_file: null,
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
        title="Players"
        description="Manage community player profiles."
        action={<button className="btn-primary" onClick={openNew}><ImagePlus size={16} /> Add Player</button>}
      />
      <SearchBox value={query} onChange={setQuery} placeholder="Search players..." />
      {!filtered.length ? <EmptyState>No players found.</EmptyState> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
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
            <label className="toggle-label"><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} /> Active</label>
            <label className="file-label"><Upload size={16} /> Upload Image<input type="file" accept="image/*" onChange={event => setForm({ ...form, image_file: event.target.files[0] })} /></label>
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
          </form>
        </AdminModal>
      )}
    </div>
  );
}

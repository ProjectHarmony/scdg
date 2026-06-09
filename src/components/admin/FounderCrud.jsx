import { useMemo, useState } from 'react';
import { ImagePlus, Pencil, Trash2, Upload } from 'lucide-react';
import { AdminModal, AdminSectionHeader, EmptyState, SearchBox } from './AdminShell';
import { uploadMedia } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const emptyFounder = {
  name: '',
  role: '',
  description: '',
  image_url: '',
  image_file: null,
  display_order: 0,
  is_active: true,
};

function toForm(item = emptyFounder) {
  return { ...emptyFounder, ...item, image_file: null };
}

export function FounderCrud({ items, refreshAll, notify = () => {} }) {
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyFounder);
  const [editingId, setEditingId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => items.filter(item =>
    `${item.name} ${item.role}`.toLowerCase().includes(query.toLowerCase())
  ), [items, query]);

  function openForm(item) {
    setEditingId(item?.id || '');
    setForm(toForm(item));
    setModalOpen(true);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const uploadedUrl = await uploadMedia(form.image_file);
      const payload = {
        name: form.name,
        role: form.role,
        description: form.description,
        image_url: uploadedUrl || form.image_url,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
      };
      const request = editingId
        ? supabase.from('founders').update(payload).eq('id', editingId)
        : supabase.from('founders').insert(payload);
      const { error } = await request;
      if (error) throw error;
      notify('Founder saved.');
      setModalOpen(false);
      setEditingId('');
      setForm(emptyFounder);
      refreshAll();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Delete ${item.name}?`)) return;
    const { error } = await supabase.from('founders').delete().eq('id', item.id);
    if (error) notify(error.message, 'error');
    else {
      notify('Founder deleted.');
      refreshAll();
    }
  }

  return (
    <div className="admin-panel">
      <AdminSectionHeader
        title="Founders"
        description="Manage founder and representative profiles shown on the homepage."
        action={<button className="btn-primary" onClick={() => openForm()}><ImagePlus size={16} /> Add Founder</button>}
      />
      <SearchBox value={query} onChange={setQuery} placeholder="Search founders..." />
      {!filtered.length ? <EmptyState>No founders found.</EmptyState> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Role</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.role}</td>
                  <td>{item.display_order}</td>
                  <td>{item.is_active ? 'Active' : 'Inactive'}</td>
                  <td><div className="admin-row-actions"><button className="btn-outline" onClick={() => openForm(item)}><Pencil size={15} /> Edit</button><button className="btn-outline" onClick={() => remove(item)}><Trash2 size={15} /> Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modalOpen && (
        <AdminModal title={editingId ? 'Edit Founder' : 'Add Founder'} onClose={() => setModalOpen(false)}>
          <form className="admin-form" onSubmit={save}>
            <input required placeholder="Name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
            <input placeholder="Role / title" value={form.role} onChange={event => setForm({ ...form, role: event.target.value })} />
            <input placeholder="Image URL" value={form.image_url} onChange={event => setForm({ ...form, image_url: event.target.value })} />
            <input type="number" placeholder="Display order" value={form.display_order} onChange={event => setForm({ ...form, display_order: Number(event.target.value) })} />
            <label className="toggle-label"><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} /> Active</label>
            <label className="file-label"><Upload size={16} /> Upload Image<input type="file" accept="image/*" onChange={event => setForm({ ...form, image_file: event.target.files[0] })} /></label>
            <textarea placeholder="Short description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
          </form>
        </AdminModal>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { CalendarDays, Pencil, Trash2, Upload } from 'lucide-react';
import { AdminModal, AdminSectionHeader, EmptyState, SearchBox } from './AdminShell';
import { uploadMedia } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const emptyEvent = {
  title: '',
  event_date: '',
  location: '',
  image_url: '',
  image_file: null,
  registration_url: '',
  is_active: true,
  description: '',
};

function toForm(item = emptyEvent) {
  return { ...emptyEvent, ...item, image_file: null };
}

export function EventCrud({ items, refreshAll, notify = () => {} }) {
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyEvent);
  const [editingId, setEditingId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => items.filter(item =>
    `${item.title} ${item.location}`.toLowerCase().includes(query.toLowerCase())
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
        title: form.title,
        event_date: form.event_date,
        location: form.location,
        image_url: uploadedUrl || form.image_url,
        registration_url: form.registration_url,
        is_active: form.is_active,
        description: form.description,
      };
      const request = editingId
        ? supabase.from('events').update(payload).eq('id', editingId)
        : supabase.from('events').insert(payload);
      const { error } = await request;
      if (error) throw error;
      notify('Event saved.');
      setModalOpen(false);
      setEditingId('');
      setForm(emptyEvent);
      refreshAll();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!confirm(`Delete ${item.title}?`)) return;
    const { error } = await supabase.from('events').delete().eq('id', item.id);
    if (error) notify(error.message, 'error');
    else {
      notify('Event deleted.');
      refreshAll();
    }
  }

  return (
    <div className="admin-panel">
      <AdminSectionHeader
        title="Events"
        description="Manage active upcoming events and Google Forms registration links."
        action={<button className="btn-primary" onClick={() => openForm()}><CalendarDays size={16} /> Add Event</button>}
      />
      <SearchBox value={query} onChange={setQuery} placeholder="Search events..." />
      {!filtered.length ? <EmptyState>No events found.</EmptyState> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Title</th><th>Date</th><th>Location</th><th>Status</th><th>Registration</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.event_date}</td>
                  <td>{item.location}</td>
                  <td>{item.is_active ? 'Active' : 'Inactive'}</td>
                  <td>{item.registration_url ? 'Ready' : 'Missing'}</td>
                  <td><div className="admin-row-actions"><button className="btn-outline" onClick={() => openForm(item)}><Pencil size={15} /> Edit</button><button className="btn-outline" onClick={() => remove(item)}><Trash2 size={15} /> Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modalOpen && (
        <AdminModal title={editingId ? 'Edit Event' : 'Add Event'} onClose={() => setModalOpen(false)}>
          <form className="admin-form" onSubmit={save}>
            <input required placeholder="Title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
            <input required type="date" value={form.event_date} onChange={event => setForm({ ...form, event_date: event.target.value })} />
            <input placeholder="Location / venue" value={form.location} onChange={event => setForm({ ...form, location: event.target.value })} />
            <input placeholder="Image URL" value={form.image_url} onChange={event => setForm({ ...form, image_url: event.target.value })} />
            <input placeholder="Google Forms link" value={form.registration_url} onChange={event => setForm({ ...form, registration_url: event.target.value })} />
            <label className="toggle-label"><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} /> Active</label>
            <label className="file-label"><Upload size={16} /> Upload Image<input type="file" accept="image/*" onChange={event => setForm({ ...form, image_file: event.target.files[0] })} /></label>
            <textarea placeholder="Description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
          </form>
        </AdminModal>
      )}
    </div>
  );
}

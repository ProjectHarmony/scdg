import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminModal, AdminSectionHeader, EmptyState } from './AdminShell';
import { supabase } from '../../lib/supabase';

const emptyLink = { label: '', url: '', display_order: 0, is_active: true };

export function SocialLinksCrud({ items, refreshAll, notify }) {
  const [form, setForm] = useState(emptyLink);
  const [editingId, setEditingId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  async function save(event) {
    event.preventDefault();
    const payload = { label: form.label, url: form.url, display_order: Number(form.display_order) || 0, is_active: form.is_active };
    const request = editingId ? supabase.from('social_links').update(payload).eq('id', editingId) : supabase.from('social_links').insert(payload);
    const { error } = await request;
    if (error) notify(error.message, 'error');
    else { notify('Social link saved.'); setModalOpen(false); refreshAll(); }
  }

  async function remove(item) {
    if (!confirm(`Delete ${item.label}?`)) return;
    const { error } = await supabase.from('social_links').delete().eq('id', item.id);
    if (error) notify(error.message, 'error');
    else { notify('Social link deleted.'); refreshAll(); }
  }

  return (
    <div className="admin-panel">
      <AdminSectionHeader title="Social Links" description="Controls Join the Community buttons." action={<button className="btn-primary" onClick={() => { setForm(emptyLink); setEditingId(''); setModalOpen(true); }}><Plus size={16} /> Add Link</button>} />
      {!items.length ? <EmptyState>No social links yet.</EmptyState> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Label</th><th>URL</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.label}</td><td>{item.url}</td><td>{item.display_order}</td><td>{item.is_active ? 'Active' : 'Inactive'}</td><td><div className="admin-row-actions"><button className="btn-outline" onClick={() => { setForm(item); setEditingId(item.id); setModalOpen(true); }}><Pencil size={15} /> Edit</button><button className="btn-outline" onClick={() => remove(item)}><Trash2 size={15} /> Delete</button></div></td></tr>)}</tbody></table></div>}
      {modalOpen && <AdminModal title={editingId ? 'Edit Social Link' : 'Add Social Link'} onClose={() => setModalOpen(false)}><form className="admin-form" onSubmit={save}>
        <input required placeholder="Label" value={form.label} onChange={event => setForm({ ...form, label: event.target.value })} />
        <input required placeholder="URL" value={form.url} onChange={event => setForm({ ...form, url: event.target.value })} />
        <input type="number" placeholder="Display order" value={form.display_order} onChange={event => setForm({ ...form, display_order: Number(event.target.value) })} />
        <label className="toggle-label"><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} /> Active</label>
        <button className="btn-primary">Save</button>
      </form></AdminModal>}
    </div>
  );
}

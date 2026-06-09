import { useMemo, useState } from 'react';
import { ImagePlus, Pencil, Trash2, Upload } from 'lucide-react';
import { AdminModal, AdminSectionHeader, EmptyState, SearchBox } from './AdminShell';
import { uploadMedia } from '../../lib/media';
import { supabase } from '../../lib/supabase';

const emptyItem = { name: '', description: '', price: '', image_url: '', image_file: null, is_active: true };

export function StoreCrud({ items, refreshAll, notify }) {
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyItem);
  const [editingId, setEditingId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => items.filter(item => item.name?.toLowerCase().includes(query.toLowerCase())), [items, query]);

  async function save(event) {
    event.preventDefault();
    try {
      const uploadedUrl = await uploadMedia(form.image_file);
      const payload = { name: form.name, description: form.description, price: form.price, image_url: uploadedUrl || form.image_url, is_active: form.is_active };
      const request = editingId ? supabase.from('store_items').update(payload).eq('id', editingId) : supabase.from('store_items').insert(payload);
      const { error } = await request;
      if (error) throw error;
      notify('Product saved.');
      setModalOpen(false);
      setEditingId('');
      setForm(emptyItem);
      refreshAll();
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function remove(item) {
    if (!confirm(`Delete ${item.name}?`)) return;
    const { error } = await supabase.from('store_items').delete().eq('id', item.id);
    if (error) notify(error.message, 'error');
    else { notify('Product deleted.'); refreshAll(); }
  }

  return (
    <div className="admin-panel">
      <AdminSectionHeader title="Store" description="Manage public merchandise cards." action={<button className="btn-primary" onClick={() => { setForm(emptyItem); setEditingId(''); setModalOpen(true); }}><ImagePlus size={16} /> Add Product</button>} />
      <SearchBox value={query} onChange={setQuery} placeholder="Search products..." />
      {!filtered.length ? <EmptyState>No products found.</EmptyState> : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {filtered.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.price}</td><td>{item.is_active ? 'Active' : 'Inactive'}</td><td><div className="admin-row-actions"><button className="btn-outline" onClick={() => { setForm({ ...emptyItem, ...item, image_file: null }); setEditingId(item.id); setModalOpen(true); }}><Pencil size={15} /> Edit</button><button className="btn-outline" onClick={() => remove(item)}><Trash2 size={15} /> Delete</button></div></td></tr>)}
        </tbody></table></div>
      )}
      {modalOpen && <AdminModal title={editingId ? 'Edit Product' : 'Add Product'} onClose={() => setModalOpen(false)}><form className="admin-form" onSubmit={save}>
        <input required placeholder="Product name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
        <input placeholder="Price" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} />
        <input placeholder="Image URL" value={form.image_url} onChange={event => setForm({ ...form, image_url: event.target.value })} />
        <label className="toggle-label"><input type="checkbox" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} /> Active</label>
        <label className="file-label"><Upload size={16} /> Upload Image<input type="file" accept="image/*" onChange={event => setForm({ ...form, image_file: event.target.files[0] })} /></label>
        <textarea placeholder="Description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
        <button className="btn-primary">Save</button>
      </form></AdminModal>}
    </div>
  );
}

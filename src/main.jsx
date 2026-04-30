import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { CalendarDays, ImagePlus, LogOut, ShieldCheck, Trash2, Upload, Users } from 'lucide-react';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const mediaBucket = 'scdg-media';
const fallbackImg = '/img/scdg-logo.png';

function mapPlayer(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    type: row.type,
    badge: row.badge,
    imageUrl: row.image_url || fallbackImg,
    deckImageUrl: row.deck_image_url || fallbackImg,
    description: row.description,
    combo: row.combo,
    mainText: row.main_text,
    styleText: row.style_text,
  };
}

function Navbar({ page, setPage, session }) {
  const links = [['home', 'Home'], ['events', 'Events'], ['gallery', 'Gallery'], ['admin', session ? 'Admin' : 'Login']];
  return <nav>
    <button className="nav-brand" onClick={() => setPage('home')}>S-CDG BLADERS</button>
    <div className="nav-links">{links.map(([id, label]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>{label}</button>)}</div>
  </nav>;
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('show')), { threshold: 0.16 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Landing({ players, gallery, setPage, onContact }) {
  useReveal();
  const featuredFallback = players[0] || { name: 'S-CDG', role: 'Community', type: 'Balance Type', badge: 'Main Blader', imageUrl: fallbackImg, deckImageUrl: fallbackImg, description: 'Competitive Beyblade X community focused on skill, strategy, deck building, and local tournaments.', combo: '3V3 Deck Format', mainText: 'Attack', styleText: 'Strategic' };
  const [featuredId, setFeaturedId] = useState(featuredFallback.id);
  const featured = players.find(p => p.id === featuredId) || featuredFallback;

  return <main>
    <section className="hero">
      <div className="hero-content reveal">
        <div className="eyebrow">Beyblade X Community</div>
        <h1 className="hero-name">S-CDG <span>Bladers</span></h1>
        <p className="hero-sub">Competitive Beyblade X community focused on skill, strategy, deck building, and local tournaments.</p>
        <div className="hero-cta"><button className="btn-primary" onClick={() => setPage('events')}>Join Event</button><button className="btn-outline" onClick={() => document.getElementById('players')?.scrollIntoView({ behavior: 'smooth' })}>View Players</button></div>
      </div>
      <div className="hero-card reveal"><img className="hero-blade" src={fallbackImg} alt="S-CDG Logo"/><div className="hero-mini-card"><div><strong>3V3</strong><span>Deck Format</span></div><div><strong>X</strong><span>Beyblade System</span></div><div><strong>S-CDG</strong><span>Local Bladers</span></div></div></div>
    </section>

    <section className="reveal"><div className="about-card"><div><div className="section-tag">About Us</div><h2 className="section-title">Built for <span>Bladers</span></h2><p>We are a growing Beyblade X community dedicated to competitive play, training sessions, local tournaments, and friendly battles.</p></div><div className="stats-row"><div className="stat-box"><strong>{players.length}</strong><span>Players</span></div><div className="stat-box"><strong>{gallery.length}</strong><span>Gallery Posts</span></div><div className="stat-box"><strong>∞</strong><span>Battles</span></div></div></div></section>

    <section id="featured"><div className="section-head reveal"><div><div className="section-tag">Featured Player</div><h2 className="section-title">Player <span>Showcase</span></h2></div></div><div className="featured-layout reveal"><div className="featured-player-card"><div className="featured-bg-name">{featured.name}</div><img className="featured-player-img" src={featured.imageUrl} onError={e => e.currentTarget.src = fallbackImg} alt={featured.name}/><div className="featured-rank">{featured.badge}</div></div><div className="featured-info-card"><div><span className="player-type">{featured.type}</span><h3>{featured.name}</h3><p>{featured.description}</p><div className="blade-dots"><div className="blade-dot"><div className="circle">3</div><strong>Beyblades</strong><span>Deck Count</span></div><div className="blade-dot"><div className="circle">A</div><strong>Main Type</strong><span>{featured.mainText}</span></div><div className="blade-dot"><div className="circle">S</div><strong>Style</strong><span>{featured.styleText}</span></div></div><div className="deck-strip"><img src={featured.deckImageUrl} onError={e => e.currentTarget.src = fallbackImg} alt="deck"/><div><h4>{featured.combo}</h4><p>{featured.description}</p></div></div></div><div className="player-tabs">{players.map(p => <button key={p.id} className={`player-tab ${featured.id === p.id ? 'active' : ''}`} onClick={() => setFeaturedId(p.id)}><strong>{p.name}</strong><span>{p.role}</span></button>)}</div></div></div></section>

    <section id="players" className="reveal"><div className="section-tag">Players</div><h2 className="section-title">Meet the <span>Team</span></h2><div className="players-grid">{players.map(p => <article className="player-card" key={p.id}><img src={p.imageUrl} onError={e => e.currentTarget.src = fallbackImg} alt={p.name}/><div className="player-name">{p.name}</div><div className="player-role">{p.role}</div></article>)}</div></section>

    <section className="reveal"><div className="contact-card"><div><div className="section-tag">Contact</div><h2 className="section-title">Join the <span>Community</span></h2><p>Want to battle, train, or join tournaments? Send your details below.</p></div><ContactForm onSubmit={onContact}/></div></section>
  </main>;
}

function ContactForm({ onSubmit }) {
  const [form, setForm] = useState({ full_name: '', email: '', message: '' });
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit(form);
    setBusy(false);
    if (ok) { setForm({ full_name: '', email: '', message: '' }); alert('Message saved!'); }
  }
  return <form className="form-card" onSubmit={submit}><input required placeholder="Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}/><input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/><textarea required placeholder="Message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}/><button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Message Us'}</button></form>;
}

function Gallery({ items }) {
  return <main className="page"><div className="section-tag">Gallery</div><h1 className="section-title">Community <span>Gallery</span></h1><div className="gallery-grid">{items.map(g => <article className="gallery-card" key={g.id}><img src={g.image_url} onError={e => e.currentTarget.src = fallbackImg} alt={g.title}/><div><span>{g.category}</span><h3>{g.title}</h3><p>{g.caption}</p></div></article>)}</div></main>;
}

function Events({ events, onRegister }) {
  const [event, setEvent] = useState(null);
  return <main className="page"><div className="section-tag">Events</div><h1 className="section-title">Event <span>List</span></h1><div className="events-grid">{events.map(ev => <article className="event-card" key={ev.id}><CalendarDays/><h3>{ev.title}</h3><p>{ev.description}</p><div className="meta">{ev.event_date} • {ev.venue} • {ev.slots} slots</div><button className="btn-primary" onClick={() => setEvent(ev)}>Register</button></article>)}</div>{event && <RegisterModal event={event} close={() => setEvent(null)} submit={onRegister}/>}</main>;
}

function RegisterModal({ event, close, submit }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', deck_notes: '' });
  const [busy, setBusy] = useState(false);
  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await submit({ ...form, event_id: event.id, event_title: event.title });
    setBusy(false);
    if (ok) { alert('Registration saved!'); close(); }
  }
  return <div className="modal"><form className="modal-card" onSubmit={onSubmit}><button type="button" className="x" onClick={close}>×</button><div className="section-tag">Register</div><h2>{event.title}</h2><input required placeholder="Full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}/><input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/><input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/><textarea placeholder="Deck / notes" value={form.deck_notes} onChange={e => setForm({ ...form, deck_notes: e.target.value })}/><button className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Submit Registration'}</button></form></div>;
}

function Login({ refreshSession }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) alert(error.message);
    else refreshSession();
  }
  return <main className="page auth-page"><form className="auth-card" onSubmit={submit}><ShieldCheck size={42}/><h1 className="section-title">Admin <span>Login</span></h1><input required type="email" placeholder="Admin email" value={email} onChange={e => setEmail(e.target.value)}/><input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}/><button className="btn-primary" disabled={busy}>{busy ? 'Logging in...' : 'Login'}</button></form></main>;
}

async function uploadMedia(file) {
  if (!file) return '';
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(mediaBucket).upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from(mediaBucket).getPublicUrl(path).data.publicUrl;
}

function Admin({ session, refreshAll, setPage, players, gallery, events, registrations, messages }) {
  const [tab, setTab] = useState('players');
  async function logout() { await supabase.auth.signOut(); setPage('home'); }
  return <main className="page"><div className="admin-head"><div><div className="section-tag">Admin</div><h1 className="section-title">Manage <span>Content</span></h1><p>{session?.user?.email}</p></div><button className="btn-outline" onClick={logout}><LogOut size={16}/> Logout</button></div><div className="admin-tabs">{['players','gallery','events','registrations','messages'].map(t => <button className={tab === t ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>{tab === 'players' && <PlayerCrud items={players} refreshAll={refreshAll}/>} {tab === 'gallery' && <GalleryCrud items={gallery} refreshAll={refreshAll}/>} {tab === 'events' && <EventCrud items={events} refreshAll={refreshAll}/>} {tab === 'registrations' && <DataList items={registrations}/>} {tab === 'messages' && <DataList items={messages}/>}</main>;
}

function PlayerCrud({ items, refreshAll }) {
  const empty = { name: '', role: '', type: '', badge: '', description: '', combo: '', main_text: '', style_text: '', image_file: null, deck_file: null };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault(); setBusy(true);
    try {
      const image_url = await uploadMedia(form.image_file);
      const deck_image_url = await uploadMedia(form.deck_file);
      const payload = { name: form.name, role: form.role, type: form.type, badge: form.badge, description: form.description, combo: form.combo, main_text: form.main_text, style_text: form.style_text, image_url: image_url || fallbackImg, deck_image_url: deck_image_url || fallbackImg };
      const { error } = await supabase.from('players').insert(payload);
      if (error) throw error;
      setForm(empty); await refreshAll();
    } catch (err) { alert(err.message); } finally { setBusy(false); }
  }
  return <div className="crud"><form className="admin-form" onSubmit={add}><input required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/><input placeholder="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}/><input placeholder="Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}/><input placeholder="Badge" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })}/><input placeholder="Combo" value={form.combo} onChange={e => setForm({ ...form, combo: e.target.value })}/><input placeholder="Main text" value={form.main_text} onChange={e => setForm({ ...form, main_text: e.target.value })}/><input placeholder="Style text" value={form.style_text} onChange={e => setForm({ ...form, style_text: e.target.value })}/><textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/><label className="file-label"><Upload size={16}/> Player Image<input type="file" accept="image/*" onChange={e => setForm({ ...form, image_file: e.target.files[0] })}/></label><label className="file-label"><Upload size={16}/> Deck Image<input type="file" accept="image/*" onChange={e => setForm({ ...form, deck_file: e.target.files[0] })}/></label><button className="btn-primary" disabled={busy}><ImagePlus size={16}/> {busy ? 'Saving...' : 'Add Player'}</button></form><RecordCards table="players" items={items} titleKey="name" refreshAll={refreshAll}/></div>;
}

function GalleryCrud({ items, refreshAll }) {
  const [form, setForm] = useState({ title: '', category: '', caption: '', image_file: null });
  const [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault(); setBusy(true);
    try {
      const image_url = await uploadMedia(form.image_file);
      const { error } = await supabase.from('gallery').insert({ title: form.title, category: form.category, caption: form.caption, image_url: image_url || fallbackImg });
      if (error) throw error;
      setForm({ title: '', category: '', caption: '', image_file: null }); await refreshAll();
    } catch (err) { alert(err.message); } finally { setBusy(false); }
  }
  return <div className="crud"><form className="admin-form" onSubmit={add}><input required placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/><input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}/><textarea placeholder="Caption" value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })}/><label className="file-label"><Upload size={16}/> Gallery Image<input required type="file" accept="image/*" onChange={e => setForm({ ...form, image_file: e.target.files[0] })}/></label><button className="btn-primary" disabled={busy}><ImagePlus size={16}/> {busy ? 'Saving...' : 'Add Gallery'}</button></form><RecordCards table="gallery" items={items} titleKey="title" refreshAll={refreshAll}/></div>;
}

function EventCrud({ items, refreshAll }) {
  const [form, setForm] = useState({ title: '', event_date: '', venue: '', slots: 32, description: '' });
  const [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from('events').insert(form);
    setBusy(false);
    if (error) alert(error.message); else { setForm({ title: '', event_date: '', venue: '', slots: 32, description: '' }); await refreshAll(); }
  }
  return <div className="crud"><form className="admin-form" onSubmit={add}><input required placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/><input required type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })}/><input placeholder="Venue" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}/><input type="number" placeholder="Slots" value={form.slots} onChange={e => setForm({ ...form, slots: Number(e.target.value) })}/><textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/><button className="btn-primary" disabled={busy}><CalendarDays size={16}/> {busy ? 'Saving...' : 'Add Event'}</button></form><RecordCards table="events" items={items} titleKey="title" refreshAll={refreshAll}/></div>;
}

function RecordCards({ table, items, titleKey, refreshAll }) {
  async function remove(id) {
    if (!confirm('Delete this record?')) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) alert(error.message); else refreshAll();
  }
  return <div className="data-grid">{items.map(item => <article className="data-card" key={item.id}><h3>{item[titleKey]}</h3>{Object.entries(item).slice(1, 6).map(([k, v]) => <p key={k}><b>{k}:</b> {String(v || '')}</p>)}<button className="btn-outline" onClick={() => remove(item.id)}><Trash2 size={16}/> Delete</button></article>)}</div>;
}

function DataList({ items }) {
  return <div className="data-grid">{items.length ? items.map((item, i) => <article className="data-card" key={item.id || i}>{Object.entries(item).map(([k, v]) => <p key={k}><b>{k}:</b> {String(v || '')}</p>)}</article>) : <p>No records yet.</p>}</div>;
}

function MissingEnv() {
  return <main className="page auth-page"><div className="auth-card"><ShieldCheck size={42}/><h1 className="section-title">Supabase <span>Needed</span></h1><p>Create `.env` from `.env.example`, add your Supabase URL and anon key, then restart `npm run dev`.</p></div></main>;
}

function App() {
  const [page, setPage] = useState('home');
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [messages, setMessages] = useState([]);
  const envReady = Boolean(supabaseUrl && supabaseAnonKey);

  async function refreshSession() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  }

  async function refreshAll() {
    const [p, g, e] = await Promise.all([
      supabase.from('players').select('*').order('created_at', { ascending: false }),
      supabase.from('gallery').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('event_date', { ascending: true })
    ]);
    if (p.error) alert(p.error.message); else setPlayers((p.data || []).map(mapPlayer));
    if (g.error) alert(g.error.message); else setGallery(g.data || []);
    if (e.error) alert(e.error.message); else setEvents(e.data || []);

    const { data: s } = await supabase.auth.getSession();
    if (s.session) {
      const [r, m] = await Promise.all([
        supabase.from('event_registrations').select('*').order('created_at', { ascending: false }),
        supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
      ]);
      if (!r.error) setRegistrations(r.data || []);
      if (!m.error) setMessages(m.data || []);
    }
  }

  useEffect(() => {
    if (!envReady) return;
    refreshSession(); refreshAll();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { refreshSession(); refreshAll(); });
    return () => sub.subscription.unsubscribe();
  }, [envReady]);

  async function saveRegistration(payload) {
    const { error } = await supabase.from('event_registrations').insert(payload);
    if (error) { alert(error.message); return false; }
    return true;
  }

  async function saveMessage(payload) {
    const { error } = await supabase.from('contact_messages').insert(payload);
    if (error) { alert(error.message); return false; }
    return true;
  }

  if (!envReady) return <MissingEnv/>;

  return <><Navbar page={page} setPage={setPage} session={session}/>{page === 'home' && <Landing players={players} gallery={gallery} setPage={setPage} onContact={saveMessage}/>} {page === 'gallery' && <Gallery items={gallery}/>} {page === 'events' && <Events events={events} onRegister={saveRegistration}/>} {page === 'admin' && (session ? <Admin session={session} refreshAll={refreshAll} setPage={setPage} players={players} gallery={gallery} events={events} registrations={registrations} messages={messages}/> : <Login refreshSession={refreshSession}/>) }<footer>© 2026 S-CDG Bladers. All rights reserved.</footer></>;
}

createRoot(document.getElementById('root')).render(<App/>);

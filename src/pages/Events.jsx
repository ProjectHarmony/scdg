import { CalendarDays, MapPin } from 'lucide-react';
import { SectionIntro } from '../components/SectionIntro';
import { FALLBACK_IMAGE } from '../lib/constants';

export function Events({ events, loading, error }) {
  return (
    <main className="page">
      <SectionIntro
        tag="Events"
        title="Battle"
        highlight="Schedule"
        copy="Upcoming active events pulled from Supabase, sorted so the nearest battle appears first."
      />
      {loading && <div className="status-card">Loading events...</div>}
      {error && <div className="status-card error-state">{error}</div>}
      {!loading && !error && !events.length && (
        <div className="empty-state">
          <h3>No active events yet</h3>
          <p>Upcoming events will appear here once they are published by the admin.</p>
        </div>
      )}
      {!loading && !error && Boolean(events.length) && (
        <div className="events-grid">
          {events.map(item => (
            <article className="event-card" key={item.id}>
              <img
                className="event-image"
                src={item.image_url || FALLBACK_IMAGE}
                onError={event => {
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
                alt={item.title}
              />
              <div className="event-content">
                <CalendarDays />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="meta">{item.event_date}</div>
                {item.location && (
                  <div className="event-location">
                    <MapPin size={15} />
                    <span>{item.location}</span>
                  </div>
                )}
                {item.registration_url ? (
                  <a className="btn-primary" href={item.registration_url} target="_blank" rel="noreferrer">
                    Join Event
                  </a>
                ) : (
                  <button className="btn-outline" disabled>
                    Registration Soon
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

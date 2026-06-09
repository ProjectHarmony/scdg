import { FALLBACK_IMAGE } from '../lib/constants';

export function FoundersCarousel({ founders }) {
  if (!founders.length) {
    return (
      <div className="empty-state">
        <h3>Founders coming soon</h3>
        <p>Founder and representative profiles will appear here once they are added in admin.</p>
      </div>
    );
  }

  return (
    <div className="founders-carousel" aria-label="S-CDG founders and representatives">
      {founders.map(founder => (
        <article className="founder-card" key={founder.id}>
          {founder.image_url ? (
            <img
              className="founder-image"
              src={founder.image_url}
              onError={event => {
                event.currentTarget.src = FALLBACK_IMAGE;
              }}
              alt={founder.name}
            />
          ) : (
            <div className="founder-image-placeholder">
              <span>Photo Coming Soon</span>
            </div>
          )}
          <div className="founder-overlay">
            <span>{founder.role}</span>
            <h3>{founder.name}</h3>
            <p>{founder.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

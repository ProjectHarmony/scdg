import { ExternalLink } from 'lucide-react';

function SocialIcon({ label }) {
  if (label.toLowerCase().includes('facebook')) {
    return <span className="facebook-icon" aria-hidden="true">f</span>;
  }

  return <ExternalLink size={16} />;
}

export function SocialLinks({ links }) {
  if (!links.length) {
    return <div className="status-card">Social links coming soon.</div>;
  }

  return (
    <div className="social-links" aria-label="S-CDG social media links">
      {links.map(link => (
        <a className="social-button" href={link.url} target="_blank" rel="noreferrer" key={link.id || link.label}>
          {link.label}
          <SocialIcon label={link.label} />
        </a>
      ))}
    </div>
  );
}

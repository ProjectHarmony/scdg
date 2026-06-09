import { FoundersCarousel } from '../components/FoundersCarousel';
import { ProductGrid } from '../components/ProductGrid';
import { SocialLinks } from '../components/SocialLinks';
import { useReveal } from '../hooks/useReveal';
import { FALLBACK_IMAGE } from '../lib/constants';

export function Landing({ players, founders, storeItems, socialLinks, loading, error, setPage }) {
  useReveal();

  return (
    <main>
      <section className="hero">
        <div className="hero-content reveal">
          <div className="eyebrow">Beyblade X Community</div>
          <h1 className="hero-name">
            S-CDG <span>Bladers</span>
          </h1>
          <p className="hero-sub">
            Competitive Beyblade X community focused on skill, strategy, deck
            building, and local tournaments.
          </p>
          <div className="hero-cta">
            <button className="btn-primary" onClick={() => setPage('events')}>
              Join Event
            </button>
            <button
              className="btn-outline"
              onClick={() => document.getElementById('founders')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Meet Founders
            </button>
          </div>
        </div>
        <div className="hero-card reveal">
          <img className="hero-blade" src={FALLBACK_IMAGE} alt="S-CDG Logo" />
          <div className="hero-mini-card">
            <div>
              <strong>1G/3G/5G</strong>
              <span>Deck Format</span>
            </div>
            <div>
              <strong>X</strong>
              <span>Beyblade System</span>
            </div>
          </div>
        </div>
      </section>

      <section className="reveal">
        <div className="about-card">
          <div>
            <div className="section-tag">About Us</div>
            <h2 className="section-title">
              Built for <span>Bladers</span>
            </h2>
            <p>
              We are a growing Beyblade X community dedicated to competitive play,
              training sessions, local tournaments, and friendly battles.
            </p>
          </div>
          <div className="stats-row">
            <div className="stat-box">
              <strong>{players.length}</strong>
              <span>Players</span>
            </div>
            <div className="stat-box">
              <strong>{storeItems.length}</strong>
              <span>Store Items</span>
            </div>
            <div className="stat-box">
              <strong>All</strong>
              <span>Battles</span>
            </div>
          </div>
        </div>
      </section>

      <section id="featured">
        <div className="section-head reveal">
          <div>
            <div className="section-tag">Founders</div>
            <h2 className="section-title">
              Meet the <span>Founders</span>
            </h2>
          </div>
        </div>
        <div id="founders" className="reveal">
          {loading && <div className="status-card">Loading founders...</div>}
          {error && <div className="status-card error-state">{error}</div>}
          {!loading && !error && <FoundersCarousel founders={founders} />}
        </div>
      </section>

      <section className="reveal">
        <div className="section-tag">Store</div>
        <h2 className="section-title">
          Team <span>Merch</span>
        </h2>
        <ProductGrid products={storeItems} />
      </section>

      <section className="reveal">
        <div className="contact-card">
          <div>
            <div className="section-tag">Contact</div>
            <h2 className="section-title">
              Join the <span>Community</span>
            </h2>
            <p>Want to battle, train, or join tournaments? Connect with us on social media.</p>
          </div>
          <SocialLinks links={socialLinks} />
        </div>
      </section>
    </main>
  );
}

import { m } from 'framer-motion';
import { FoundersCarousel } from '../components/FoundersCarousel';
import { HeroShowpiece } from '../components/HeroShowpiece';
import { ProductGrid } from '../components/ProductGrid';
import { SectionIntro } from '../components/SectionIntro';
import { SocialLinks } from '../components/SocialLinks';
import { useReveal } from '../hooks/useReveal';

const sectionMotion = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
};

export function Landing({ players, founders, storeItems, socialLinks, loading, error, setPage }) {
  useReveal();

  return (
    <main>
      <section className="hero">
        <div className="hero-content reveal">
          <div className="eyebrow">Beyblade X Competitive Community</div>
          <h1 className="hero-name">
            S-CDG <span>Bladers</span>
          </h1>
          <p className="hero-sub">
            A sharper home for community battles, events, merch drops,
            and the players pushing the local Beyblade X scene forward.
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
        <HeroShowpiece />
      </section>

      <m.section {...sectionMotion}>
        <div className="about-card feature-panel">
          <div>
            <SectionIntro
              tag="About Us"
              title="Built for"
              highlight="Bladers"
              copy="We are a growing Beyblade X community dedicated to competitive play, training sessions, local tournaments, and friendly battles."
            />
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
      </m.section>

      <section id="featured">
        <SectionIntro
          tag="Founders"
          title="Meet the"
          highlight="Founders"
          copy="Representatives and community builders managed directly from the admin dashboard."
        />
        <div id="founders" className="reveal">
          {loading && <div className="status-card">Loading founders...</div>}
          {error && <div className="status-card error-state">{error}</div>}
          {!loading && !error && <FoundersCarousel founders={founders} />}
        </div>
      </section>

      <m.section {...sectionMotion}>
        <SectionIntro
          tag="Store"
          title="Team"
          highlight="Merch"
          copy="Community items published from Supabase. Checkout stays intentionally simple for now."
        />
        <ProductGrid products={storeItems} />
      </m.section>

      <m.section {...sectionMotion}>
        <div className="contact-card">
          <div>
            <SectionIntro
              tag="Contact"
              title="Join the"
              highlight="Community"
              copy="Want to battle, train, or join tournaments? Connect with us on social media."
            />
          </div>
          <SocialLinks links={socialLinks} />
        </div>
      </m.section>
    </main>
  );
}

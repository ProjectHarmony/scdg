import { FALLBACK_IMAGE } from '../lib/constants';

export function HeroShowpiece() {
  return (
    <div className="hero-showpiece reveal">
      <div className="hero-orbit orbit-one" />
      <div className="hero-orbit orbit-two" />
      <img className="hero-core-logo" src={FALLBACK_IMAGE} alt="S-CDG Logo" />
      <div className="hero-system-card top">
        <strong>1G/3G/5G</strong>
        <span>Deck Format</span>
      </div>
      <div className="hero-system-card bottom">
        <strong>BX</strong>
        <span>Competitive Circuit</span>
      </div>
    </div>
  );
}

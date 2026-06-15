import { ProductGrid } from '../components/ProductGrid';
import { SectionIntro } from '../components/SectionIntro';

export function Store({ products, loading, error }) {
  return (
    <main className="page">
      <SectionIntro
        tag="Store"
        title="Community"
        highlight="Store"
        copy="Official S-CDG and BouncyDragon merchandise placeholders. Checkout is not enabled yet."
      />
      {loading && <div className="status-card">Loading store...</div>}
      {error && <div className="status-card error-state">{error}</div>}
      {!loading && !error && <ProductGrid products={products} />}
    </main>
  );
}

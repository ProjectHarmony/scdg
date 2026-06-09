import { ProductGrid } from '../components/ProductGrid';

export function Store({ products, loading, error }) {
  return (
    <main className="page">
      <div className="section-tag">Store</div>
      <h1 className="section-title">
        Community <span>Store</span>
      </h1>
      <p className="page-intro">
        Official S-CDG and BouncyDragon merchandise placeholders. Checkout is not
        enabled yet.
      </p>
      {loading && <div className="status-card">Loading store...</div>}
      {error && <div className="status-card error-state">{error}</div>}
      {!loading && !error && <ProductGrid products={products} />}
    </main>
  );
}

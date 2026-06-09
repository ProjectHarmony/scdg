import { FALLBACK_IMAGE } from '../lib/constants';

export function ProductGrid({ products }) {
  if (!products.length) {
    return (
      <div className="empty-state">
        <h3>Store coming soon</h3>
        <p>Products will appear here once they are added in admin.</p>
      </div>
    );
  }

  return (
    <div className="store-grid">
      {products.map(product => (
        <article className="product-card" key={product.name}>
          {product.image_url ? (
            <img className="product-image" src={product.image_url} onError={event => { event.currentTarget.src = FALLBACK_IMAGE; }} alt={product.name} />
          ) : (
            <div className="product-image-placeholder">
              <span>Product Image</span>
            </div>
          )}
          <div className="product-info">
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <strong>{product.price}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

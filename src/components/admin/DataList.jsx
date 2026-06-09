export function DataList({ items }) {
  if (!items.length) return <p>No records yet.</p>;

  return (
    <div className="data-grid">
      {items.map((item, index) => (
        <article className="data-card" key={item.id || index}>
          {Object.entries(item).map(([key, value]) => (
            <p key={key}>
              <b>{key}:</b> {String(value || '')}
            </p>
          ))}
        </article>
      ))}
    </div>
  );
}

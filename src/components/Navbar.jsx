const links = [
  ['home', 'Home'],
  ['events', 'Events'],
  ['store', 'Store'],
];

export function Navbar({ page, setPage }) {
  return (
    <nav>
      <button className="nav-brand" onClick={() => setPage('home')}>
        S-CDG BLADERS
      </button>
      <div className="nav-links">
        {links.map(([id, label]) => (
          <button
            key={id}
            className={page === id ? 'active' : ''}
            onClick={() => setPage(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

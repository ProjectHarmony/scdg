import { FALLBACK_IMAGE } from '../lib/constants';

const medalLabels = ['Champion', 'Second Place', 'Third Place'];

export function Rankings({ players, loading, error }) {
  const topThree = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <main className="page">
      <div className="section-tag">Rankings</div>
      <h1 className="section-title">
        Player <span>Rankings</span>
      </h1>
      {loading && <div className="status-card">Loading rankings...</div>}
      {error && <div className="status-card error-state">{error}</div>}
      {!loading && !error && !players.length && (
        <div className="empty-state">
          <h3>No rankings yet</h3>
          <p>Active players will appear here once they are added in admin.</p>
        </div>
      )}
      {!loading && !error && Boolean(players.length) && (
        <>
          <div className="rankings-podium">
            {topThree.map((player, index) => (
              <article className={`podium-card podium-${index + 1}`} key={player.id}>
                <strong className="podium-rank">#{index + 1}</strong>
                <span className="podium-label">{medalLabels[index]}</span>
                <img
                  src={player.imageUrl}
                  onError={event => {
                    event.currentTarget.src = FALLBACK_IMAGE;
                  }}
                  alt={player.name}
                />
                <h2>{player.name}</h2>
                <p>{player.mmr} MMR</p>
                <div className="ranking-meta">
                  {player.wins}W - {player.losses}L / {player.matchesPlayed} matches
                </div>
              </article>
            ))}
          </div>
          {rest.length > 0 && (
            <div className="rankings-grid rankings-list">
              {rest.map((player, index) => (
                <article className="ranking-card" key={player.id}>
                  <strong className="ranking-position">#{index + 4}</strong>
                  <img
                    src={player.imageUrl}
                    onError={event => {
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                    alt={player.name}
                  />
                  <div>
                    <div className="player-name">{player.name}</div>
                    <div className="ranking-meta">
                      {player.mmr} MMR / {player.wins}W - {player.losses}L / {player.matchesPlayed} matches
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

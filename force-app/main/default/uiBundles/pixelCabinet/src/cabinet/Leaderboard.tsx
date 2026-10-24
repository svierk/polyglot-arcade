import { useEffect, useState } from 'react';
import { fetchLeaderboard, type LeaderboardEntry } from '@/api/arcadeApi';

interface LeaderboardState {
  entries: LeaderboardEntry[] | null;
  error: string | null;
}

/**
 * Top scores of one game. Bump `refreshKey` to refetch, e.g. after a score
 * was saved; `enabled = false` skips the query (embedded, the Lightning page
 * shows its own leaderboard).
 */
export function useLeaderboard(
  gameKey: string,
  refreshKey = 0,
  enabled = true
): LeaderboardState {
  const [state, setState] = useState<LeaderboardState>({
    entries: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchLeaderboard(gameKey)
      .then(entries => {
        if (!cancelled) setState({ entries, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState(prev => ({ ...prev, error: err.message }));
      });
    return () => {
      cancelled = true;
    };
  }, [gameKey, refreshKey, enabled]);

  return state;
}

const ORDINAL_SUFFIXES = ['th', 'st', 'nd', 'rd'];

/** 1st, 2nd, 3rd, 4th ... as on an arcade high-score screen. */
export function ordinal(rank: number): string {
  const tens = rank % 100;
  const suffix =
    tens >= 11 && tens <= 13 ? 'th' : (ORDINAL_SUFFIXES[rank % 10] ?? 'th');
  return `${rank}${suffix}`;
}

/** The high-score card; each machine styles it in its own look. */
export default function Leaderboard({ entries, error }: LeaderboardState) {
  return (
    <section className="hiscores" aria-label="Leaderboard">
      <h2 className="hiscores-title">High scores</h2>
      {error && (
        <p className="hiscores-note" role="alert">
          {error}
        </p>
      )}
      {!error && entries === null && <p className="hiscores-note">Loading…</p>}
      {entries?.length === 0 && (
        <p className="hiscores-note">No scores yet. Be the first!</p>
      )}
      {entries && entries.length > 0 && (
        <ol className="hiscores-list">
          {entries.map((entry, i) => (
            <li key={entry.id} className="hiscores-row">
              <span className="hiscores-rank">{ordinal(i + 1)}</span>
              <span className="hiscores-player">
                <span className="hiscores-name">{entry.player}</span>
              </span>
              <span className="hiscores-score">
                {entry.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

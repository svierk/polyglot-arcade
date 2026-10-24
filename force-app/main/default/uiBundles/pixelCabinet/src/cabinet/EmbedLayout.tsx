/**
 * Chromeless surface for the /embed route that the Arcade Game Host LWC
 * frames. The game comes from host props, so admins switch games in Lightning
 * App Builder without touching the cabinet.
 */
// Registers the ui-embedding bootstrap (handshake, auto-resize) before any
// getViewSDK() call.
import '@salesforce/platform-sdk/ui-embedding';

import { useEffect, useState } from 'react';
import { useHostProps } from '@/embedding/hostBridge';
import { CABINET_GAMES, findGame } from '@/games/registry';
import GameStage from './GameStage';

export default function EmbedLayout() {
  const props = useHostProps();
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('embedded');
    return () => document.documentElement.classList.remove('embedded');
  }, []);

  // A host-selected game wins; 'lobby' (or no prop) lets the player choose.
  const game = findGame(props.game) ?? findGame(picked);
  const accountId = props.objectApiName === 'Account' ? props.recordId : null;

  return (
    <main className="arcade-shell rounded-lg p-4">
      <h1 className="sr-only">{game ? game.name : 'Pixel Cabinet'}</h1>
      {game ? (
        <>
          {!findGame(props.game) && (
            <button
              type="button"
              className="arcade-nav-link mb-4"
              onClick={() => setPicked(null)}
            >
              ← All games
            </button>
          )}
          <GameStage
            game={game}
            source="Embedded"
            accountId={accountId}
            embedded
          />
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {CABINET_GAMES.map(g => (
            <button
              key={g.key}
              type="button"
              className="arcade-card text-left"
              style={{ '--accent': g.accent } as React.CSSProperties}
              onClick={() => setPicked(g.key)}
            >
              <span className="arcade-title text-sm">{g.name}</span>
              <span className="arcade-hint">{g.tagline}</span>
            </button>
          ))}
        </div>
      )}
      {/* Names the bundle that runs inside the Lightning frame. */}
      <p className="surface-tag">React · Pixel Cabinet UI bundle</p>
    </main>
  );
}

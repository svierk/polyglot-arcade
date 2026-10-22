/**
 * Runs one game: renders it, persists each finished round as an Arcade_Score__c
 * and, when embedded, tells the host Lightning page about it.
 */
import { useCallback, useState } from 'react';
import { saveScore, type ScoreSource } from '@/api/arcadeApi';
import { notifyHostGameOver } from '@/embedding/hostBridge';
import type { CabinetGame } from '@/games/registry';
import type { GameResult } from '@/games/types';
import Leaderboard from './Leaderboard';

type Outcome =
  | { state: 'saving' }
  | { state: 'saved'; isHighScore: boolean }
  | { state: 'failed'; message: string };

interface GameStageProps {
  game: CabinetGame;
  source: ScoreSource;
  /** Account the round is attributed to when embedded on an Account page. */
  accountId?: string | null;
  embedded?: boolean;
}

export default function GameStage({
  game,
  source,
  accountId,
  embedded = false,
}: GameStageProps) {
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const handleGameOver = useCallback(
    async (finished: GameResult) => {
      setResult(finished);
      setOutcome({ state: 'saving' });
      let saved = false;
      let isHighScore = false;
      try {
        const res = await saveScore({
          gameKey: game.key,
          score: finished.score,
          level: finished.level,
          durationSeconds: finished.durationSeconds,
          source,
          accountId,
        });
        saved = true;
        isHighScore = res.isHighScore;
        setOutcome({ state: 'saved', isHighScore });
        setSavedCount(n => n + 1);
      } catch (err) {
        setOutcome({ state: 'failed', message: (err as Error).message });
      }
      if (embedded) {
        await notifyHostGameOver({
          gameKey: game.key,
          gameName: game.name,
          score: finished.score,
          level: finished.level,
          saved,
          isHighScore,
        });
      }
    },
    [game, source, accountId, embedded]
  );

  const playAgain = () => {
    setResult(null);
    setOutcome(null);
    setRound(n => n + 1);
  };

  const Game = game.component;
  if (!Game) {
    return (
      <div className="arcade-panel mx-auto max-w-md text-center">
        <p className="arcade-title mb-2" style={{ color: game.accent }}>
          {game.name}
        </p>
        <p className="arcade-hint">
          Coming soon to this cabinet. Insert coin later!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex flex-col items-center gap-4">
        <Game key={round} onGameOver={handleGameOver} />
        {result && outcome && (
          <div
            className="arcade-panel w-full max-w-sm text-center"
            role="status"
          >
            <p className="arcade-title text-base">
              {result.score.toLocaleString()} points
            </p>
            {outcome.state === 'saving' && (
              <p className="arcade-hint">Saving to Salesforce…</p>
            )}
            {outcome.state === 'saved' && (
              <p className="text-sm text-emerald-300">
                {outcome.isHighScore
                  ? '★ New high score! ★'
                  : 'Score saved to the leaderboard.'}
              </p>
            )}
            {outcome.state === 'failed' && (
              <p className="text-sm text-rose-300">
                Could not save score: {outcome.message}
              </p>
            )}
            <button
              type="button"
              className="arcade-button mt-3"
              onClick={playAgain}
            >
              Play again
            </button>
          </div>
        )}
      </div>
      {!embedded && <Leaderboard gameKey={game.key} refreshKey={savedCount} />}
    </div>
  );
}

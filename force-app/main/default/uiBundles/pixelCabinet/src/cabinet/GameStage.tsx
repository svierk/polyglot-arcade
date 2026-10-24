/**
 * Runs one game: renders its machine, persists each finished round as an
 * Arcade_Score__c and, when embedded, tells the host Lightning page about it.
 */
import { useCallback, useState } from 'react';
import { saveScore, type ScoreSource } from '@/api/arcadeApi';
import { notifyHostGameOver } from '@/embedding/hostBridge';
import type { CabinetGame } from '@/games/registry';
import type { GameResult } from '@/games/types';
import Leaderboard, { useLeaderboard } from './Leaderboard';
import RoundResult, { type Outcome } from './RoundResult';

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
  // Embedded, the Lightning page shows its own leaderboard next to the frame.
  const leaderboard = useLeaderboard(game.key, savedCount, !embedded);

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
    <div className={`machine-stage machine-${game.key}`}>
      <Game
        key={round}
        onGameOver={handleGameOver}
        result={
          result &&
          outcome && (
            <RoundResult
              result={result}
              outcome={outcome}
              onPlayAgain={playAgain}
            />
          )
        }
        highScore={leaderboard.entries?.[0]?.score}
      />
      {!embedded && <Leaderboard {...leaderboard} />}
    </div>
  );
}

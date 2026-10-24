import type { GameResult } from '@/games/types';

export type Outcome =
  | { state: 'saving' }
  | { state: 'saved'; isHighScore: boolean }
  | { state: 'failed'; message: string };

interface RoundResultProps {
  result: GameResult;
  outcome: Outcome;
  onPlayAgain: () => void;
}

/**
 * The end of a round: score, whether it reached Salesforce and the way to the
 * next round. The machine shows it on its own screen, in its own look.
 */
export default function RoundResult({
  result,
  outcome,
  onPlayAgain,
}: RoundResultProps) {
  return (
    <div className="round-result" role="status">
      <p className="round-result-score">
        {result.score.toLocaleString()} points
      </p>
      <p className="round-result-status" data-state={outcome.state}>
        {outcome.state === 'saving' && 'Saving to Salesforce…'}
        {outcome.state === 'saved' &&
          (outcome.isHighScore
            ? '★ New high score! ★'
            : 'Score saved to the leaderboard.')}
        {outcome.state === 'failed' &&
          `Could not save score: ${outcome.message}`}
      </p>
      <button
        type="button"
        className="round-result-again"
        onClick={onPlayAgain}
      >
        Play again
      </button>
    </div>
  );
}

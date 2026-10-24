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

const STATUS: Record<Outcome['state'], (outcome: Outcome) => string> = {
  saving: () => 'Saving to Salesforce…',
  saved: outcome =>
    outcome.state === 'saved' && outcome.isHighScore
      ? '★ New high score! ★'
      : 'Score saved to the leaderboard.',
  failed: outcome =>
    outcome.state === 'failed'
      ? `Could not save score: ${outcome.message}`
      : '',
};

/**
 * What screen readers hear when a round ends: the result screen itself is
 * rendered inside the machine, which they do not browse while playing.
 */
export function announceRound(result: GameResult, outcome: Outcome): string {
  return `Game over. ${result.score.toLocaleString()} points. ${STATUS[outcome.state](outcome)}`;
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
    <div className="round-result">
      <p className="round-result-score">
        {result.score.toLocaleString()} points
      </p>
      <p className="round-result-status" data-state={outcome.state}>
        {STATUS[outcome.state](outcome)}
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

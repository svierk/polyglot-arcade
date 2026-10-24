import { useParams } from 'react-router';
import GameStage from '@/cabinet/GameStage';
import { findGame } from '@/games/registry';
import NotFound from './NotFound';

export default function GamePage() {
  const { gameKey } = useParams();
  const game = findGame(gameKey);
  if (!game) return <NotFound />;
  return (
    <section>
      {/* The machine's marquee shows the name in its own look. */}
      <h1 className="sr-only">{game.name}</h1>
      <GameStage game={game} source="Pixel Cabinet" />
    </section>
  );
}

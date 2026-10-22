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
      <h1 className="arcade-title mb-6 text-xl" style={{ color: game.accent }}>
        {game.name}
      </h1>
      <GameStage game={game} source="Pixel Cabinet" />
    </section>
  );
}

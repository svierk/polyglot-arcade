import type { ComponentType } from 'react';
import BlockDrop from './block-drop/BlockDrop';
import type { GameKey, GameProps } from './types';

export interface CabinetGame {
  key: GameKey;
  name: string;
  tagline: string;
  accent: string;
  /** Null while the game is still being built. */
  component: ComponentType<GameProps> | null;
}

export const CABINET_GAMES: readonly CabinetGame[] = [
  {
    key: 'block-drop',
    name: 'Block Drop',
    tagline: 'Stack falling blocks, clear lines, chase the next level.',
    accent: '#22d3ee',
    component: BlockDrop,
  },
  {
    key: 'pellet-chase',
    name: 'Pellet Chase',
    tagline: 'Clear the maze before the ghosts catch you.',
    accent: '#facc15',
    component: null,
  },
];

export function findGame(
  key: string | undefined | null
): CabinetGame | undefined {
  return CABINET_GAMES.find(game => game.key === key);
}

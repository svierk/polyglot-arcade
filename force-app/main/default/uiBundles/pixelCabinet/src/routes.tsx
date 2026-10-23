import type { RouteObject } from 'react-router';
import CabinetLayout from '@/cabinet/CabinetLayout';
import EmbedLayout from '@/cabinet/EmbedLayout';
import GamePage from './pages/GamePage';
import Lobby from './pages/Lobby';
import NotFound from './pages/NotFound';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <CabinetLayout />,
    children: [
      { index: true, element: <Lobby /> },
      { path: 'play/:gameKey', element: <GamePage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  // Framed by the Arcade Game Host LWC via <lightning-ui-embedding>.
  { path: '/embed', element: <EmbedLayout /> },
];

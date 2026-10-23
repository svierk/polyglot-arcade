import type { RouteObject } from 'react-router';
import CabinetLayout from '@/cabinet/CabinetLayout';
import EmbedLayout from '@/cabinet/EmbedLayout';
import GamePage from './pages/GamePage';
import HubRedirect from './pages/HubRedirect';
import NotFound from './pages/NotFound';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <CabinetLayout />,
    children: [
      // Launched from the hub lobby; the cabinet has none of its own.
      { index: true, element: <HubRedirect /> },
      { path: 'play/:gameKey', element: <GamePage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  // Framed by the Arcade Game Host LWC via <lightning-ui-embedding>.
  { path: '/embed', element: <EmbedLayout /> },
];

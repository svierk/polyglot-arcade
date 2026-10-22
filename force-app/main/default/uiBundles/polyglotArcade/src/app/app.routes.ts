import { Routes } from '@angular/router';
import { AppLayoutComponent } from './components/layout/app-layout/app-layout';
import { LeaderboardComponent } from './pages/leaderboard/leaderboard';
import { LobbyComponent } from './pages/lobby/lobby';
import { NotFoundComponent } from './pages/not-found/not-found';
import { PlayComponent } from './pages/play/play';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: '', component: LobbyComponent, data: { showInNavigation: true, label: 'Lobby' } },
      {
        path: 'leaderboard',
        component: LeaderboardComponent,
        data: { showInNavigation: true, label: 'Hall of fame' },
      },
      { path: 'play/:gameKey', component: PlayComponent },
      { path: '**', component: NotFoundComponent },
    ],
  },
];

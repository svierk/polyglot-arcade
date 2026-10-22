import { Routes } from '@angular/router';
import { AppLayoutComponent } from './components/layout/app-layout/app-layout';
import { HomeComponent } from './pages/home/home';
import { NotFoundComponent } from './pages/not-found/not-found';
import { AccountSearchPageComponent } from "./pages/account-search/account-search-page";
import { AccountDetailPageComponent } from "./pages/account-detail/account-detail-page";

export const routes: Routes = [
  {
    path: "",
    component: AppLayoutComponent,
    children: [
      {
        path: "",
        component: HomeComponent,
        data: { showInNavigation: true, label: "Home" }
      },
      {
        path: "accounts/:recordId",
        component: AccountDetailPageComponent
      },
      {
        path: "accounts",
        component: AccountSearchPageComponent
      },
      {
        path: '**',
        component: NotFoundComponent
      }
    ]
  }
];

import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'facility/:mapNumber',
    loadComponent: () =>
      import('./facility-detail/facility-detail.page').then(
        (m) => m.FacilityDetailPage,
      ),
  },
  {
    path: 'navigate/:mapNumber',
    loadComponent: () =>
      import('./navigate/navigate.page').then((m) => m.NavigatePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];

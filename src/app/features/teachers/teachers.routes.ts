import { Routes } from '@angular/router';
import { numericIdGuard } from '@/core/guards/numeric-id.guard';

export const TEACHERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/page-list/page-list').then(m => m.PageList),
  },
  {
    path: ':id',
    canActivate: [numericIdGuard],   // blocks /teachers/abc before HTTP call
    loadComponent: () =>
      import('./pages/page-detail/page-detail').then(m => m.PageDetail),
  },
  { path: '**', redirectTo: '' },
];

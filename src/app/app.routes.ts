import { Routes } from '@angular/router';
import { AdminLayout } from '@/layout/admin-layout/admin-layout';
import { authGuard } from '@/core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: AdminLayout,
    canActivate: [authGuard],   // protects every child route in one place
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'courses',
        loadChildren: () =>
          import('./features/courses/courses.routes').then((m) => m.COURSES_ROUTES),
      },
      {
        path: 'students',
        loadChildren: () =>
          import('./features/students/students.routes').then((m) => m.STUDENTS_ROUTES),
      },
      {
        path: 'teachers',
        loadChildren: () =>
          import('./features/teachers/teachers.routes').then((m) => m.TEACHERS_ROUTES),
      },
      // Catch-all: unknown top-level paths render 404 inside the admin shell
      {
        path: '**',
        loadComponent: () =>
          import('./core/pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
];

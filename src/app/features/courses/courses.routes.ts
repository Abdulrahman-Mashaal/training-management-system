import { Routes } from '@angular/router';
import { numericIdGuard } from '@/core/guards/numeric-id.guard';

export const COURSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/course-list/course-list')
        .then(m => m.CourseList)
  },
  {
    path: ':id',
    canActivate: [numericIdGuard],   // blocks /courses/abc before HTTP call
    loadComponent: () =>
      import('./pages/course-detail/course-detail')
        .then(m => m.CourseDetail)
  },
  { path: '**', redirectTo: '' },
];
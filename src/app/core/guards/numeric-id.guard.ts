import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Validates that the `:id` route parameter is a positive integer BEFORE the
 * component loads and before any HTTP request is made.
 *
 * Handled cases:
 *   /teachers/abc     → invalid (NaN)        → redirect to /teachers
 *   /teachers/0       → invalid (not > 0)    → redirect to /teachers
 *   /teachers/-5      → invalid (negative)   → redirect to /teachers
 *   /teachers/3.14    → invalid (not integer) → redirect to /teachers
 *   /teachers/42      → valid                 → route activates normally
 *
 * Non-existent-but-valid IDs (e.g. /teachers/99999) pass this guard and are
 * handled by the component's catchError → router.navigate(['/teachers']).
 *
 * Usage — add to any :id route:
 *   { path: ':id', loadComponent: ..., canActivate: [numericIdGuard] }
 */
export const numericIdGuard: CanActivateFn = (route) => {
  const raw = route.paramMap.get('id') ?? '';
  const id  = Number(raw);

  if (Number.isInteger(id) && id > 0) return true;

  // Build the parent path by collecting all URL segments up to (not including)
  // the current invalid :id segment, then navigate there.
  const segments = route.pathFromRoot
    .flatMap(r => r.url)
    .map(s => s.path)
    .filter(Boolean);

  segments.pop(); // drop the invalid :id segment

  const parentPath = segments.length ? '/' + segments.join('/') : '/';
  return inject(Router).createUrlTree([parentPath]);
};

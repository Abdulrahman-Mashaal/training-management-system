import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Auth guard — protects all routes inside AdminLayout.
 *
 * ── Current state ────────────────────────────────────────────────────────────
 * No authentication system is implemented yet, so the guard always grants
 * access (returns true).
 *
 * ── When auth is added ───────────────────────────────────────────────────────
 * Replace the `return true` line with the AuthService check shown below.
 * The `returnUrl` query-param lets the login page redirect back after login.
 *
 *   import { AuthService } from '@/core/services/auth.service';
 *
 *   const auth   = inject(AuthService);
 *   const router = inject(Router);
 *   if (auth.isLoggedIn()) return true;
 *   return router.createUrlTree(['/login'], {
 *     queryParams: { returnUrl: state.url },
 *   });
 */
export const authGuard: CanActivateFn = (_route, _state) => {
  // TODO: replace with AuthService.isLoggedIn() check when auth is implemented
  void inject(Router); // keep the injection context warm for future use
  return true;
};

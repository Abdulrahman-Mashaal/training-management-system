import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';

/**
 * Global HTTP error interceptor.
 *
 * Responsibilities (cross-cutting concerns only):
 *   • 401 Unauthorized   → toast (redirect to /login when auth is added)
 *   • 403 Forbidden      → toast
 *   • 5xx Server errors  → toast
 *   • Network / unknown  → toast
 *
 * 404 Not Found is intentionally NOT handled here — each detail-page
 * component handles it contextually (redirect to its own list route).
 *
 * All errors are re-thrown via throwError() so downstream component-level
 * catchError() handlers still execute.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const msgSvc   = inject(MessageService);
  const translate = inject(TranslateService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const summary = translate.instant('COMMON.ERROR');

      if (err.status === 401) {
        msgSvc.add({
          severity: 'error',
          summary,
          detail: translate.instant('HTTP_ERRORS.UNAUTHORIZED'),
          life: 5000,
        });
      } else if (err.status === 403) {
        msgSvc.add({
          severity: 'error',
          summary,
          detail: translate.instant('HTTP_ERRORS.FORBIDDEN'),
          life: 5000,
        });
      } else if (err.status >= 500) {
        msgSvc.add({
          severity: 'error',
          summary,
          detail: translate.instant('HTTP_ERRORS.SERVER_ERROR'),
          life: 5000,
        });
      } else if (err.status === 0) {
        // Status 0 = network error / CORS / server offline
        msgSvc.add({
          severity: 'error',
          summary,
          detail: translate.instant('HTTP_ERRORS.NETWORK'),
          life: 5000,
        });
      }

      // Re-throw — component catchError handlers still run for 404 etc.
      return throwError(() => err);
    }),
  );
};

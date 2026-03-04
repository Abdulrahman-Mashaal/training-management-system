import { inject, Injectable } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

/**
 * Maps Angular ValidationErrors to translated human-readable strings.
 *
 * Design:
 *  - Simple errors   → flat key→i18nKey map  (O(1) lookup, easy to extend)
 *  - Parametrized errors → key→handler map   (carries interpolation data)
 *  - Custom validators   → fallback to error.message or generic "invalid"
 */
@Injectable({ providedIn: 'root' })
export class ValidationMessageService {
  private readonly translate = inject(TranslateService);

  // ── Simple errors: no interpolation needed ────────────────────────────────
  private readonly simpleErrors: Record<string, string> = {
    required:    'FORM.ERRORS.REQUIRED',
    email:       'FORM.ERRORS.EMAIL',
    pattern:     'FORM.ERRORS.PATTERN',
    // ── Custom validators (AppValidators) ─────────────────────────────────
    englishOnly: 'FORM.ERRORS.ENGLISH_ONLY',
    arabicOnly:  'FORM.ERRORS.ARABIC_ONLY',
    phone:       'FORM.ERRORS.PHONE',
  };

  // ── Parametrized errors: error payload carries the interpolation values ───
  private readonly parametrizedErrors: Record<string, (payload: any) => string> = {
    minlength: (e) => this.translate.instant('FORM.ERRORS.MIN_LENGTH', { requiredLength: e.requiredLength }),
    maxlength: (e) => this.translate.instant('FORM.ERRORS.MAX_LENGTH', { requiredLength: e.requiredLength }),
    min:       (e) => this.translate.instant('FORM.ERRORS.MIN', { min: e.min }),
    max:       (e) => this.translate.instant('FORM.ERRORS.MAX', { max: e.max }),
  };

  getMessage(errors: ValidationErrors | null): string {
    if (!errors) return '';

    for (const key of Object.keys(errors)) {
      if (this.parametrizedErrors[key]) return this.parametrizedErrors[key](errors[key]);
      if (this.simpleErrors[key])       return this.translate.instant(this.simpleErrors[key]);
    }

    // Custom validator that attaches a `.message` string to its error object
    const firstKey = Object.keys(errors)[0];
    return errors[firstKey]?.message ?? this.translate.instant('FORM.ERRORS.INVALID');
  }
}

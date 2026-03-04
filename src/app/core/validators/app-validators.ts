import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Custom validators extending Angular's built-in set.
 *
 * Each validator returns a named error object so that ValidationMessageService
 * can map it to the correct i18n key via its `simpleErrors` table — keeping all
 * error messages centralized, translated, and reactive to language changes.
 *
 * Usage:
 *   new FormControl('', [Validators.required, AppValidators.englishOnly()])
 */
export class AppValidators {

  /**
   * Allows only English letters (A–Z, a–z), spaces, hyphens and apostrophes.
   * Useful for "First Name (English)" / "Last Name (English)" fields.
   * Empty / whitespace-only values pass (use Validators.required for that).
   */
  static englishOnly(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v: string = control.value ?? '';
      if (!v.trim()) return null;                          // let required handle empty
      return /^[A-Za-z\s\-']+$/.test(v) ? null : { englishOnly: true };
    };
  }

  /**
   * Allows only Arabic letters (Unicode blocks U+0600–U+06FF and U+0750–U+077F),
   * spaces, hyphens, apostrophes and the Arabic comma (،).
   * Useful for "First Name (Arabic)" / "Last Name (Arabic)" fields.
   * Empty / whitespace-only values pass (use Validators.required for that).
   */
  static arabicOnly(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v: string = control.value ?? '';
      if (!v.trim()) return null;
      return /^[\u0600-\u06FF\u0750-\u077F\s\-'،.]+$/.test(v)
        ? null
        : { arabicOnly: true };
    };
  }

  /**
   * Validates an international phone number.
   * Accepts an optional leading '+', then any combination of digits, spaces,
   * hyphens and parentheses — between 7 and 20 characters total.
   * Examples that pass:  +1-555-0201 · +966 50 123 4567 · (012) 345-6789
   * Empty values pass (use Validators.required for that).
   */
  static phone(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v: string = (control.value ?? '').trim();
      if (!v) return null;
      return /^\+?[\d\s\-().]{7,20}$/.test(v) ? null : { phone: true };
    };
  }
}

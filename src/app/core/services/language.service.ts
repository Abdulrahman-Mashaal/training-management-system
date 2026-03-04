import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PrimeNG } from 'primeng/config';

export interface Language {
  code: string;
  label: string;
  dir: 'ltr' | 'rtl';
}

// ── PrimeNG locale payloads ───────────────────────────────────────────────────

const PRIMENG_LOCALE_EN = {
  firstDayOfWeek: 0,
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  monthNames: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  monthNamesShort: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  today: 'Today',
  clear: 'Clear',
  weekHeader: 'Wk',
  dateFormat: 'dd/mm/yy',
  weak: 'Weak',
  medium: 'Medium',
  strong: 'Strong',
  passwordPrompt: 'Enter a password',
  emptyMessage: 'No results found',
  emptyFilterMessage: 'No results found',
};

const PRIMENG_LOCALE_AR = {
  firstDayOfWeek: 6, // Saturday — common week start across Arab countries
  dayNames: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  dayNamesShort: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
  dayNamesMin: ['أح', 'اث', 'ثل', 'أر', 'خم', 'جم', 'سب'],
  monthNames: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
  monthNamesShort: [
    'ينا',
    'فبر',
    'مار',
    'أبر',
    'ماي',
    'يون',
    'يول',
    'أغس',
    'سبت',
    'أكت',
    'نوف',
    'ديس',
  ],
  today: 'اليوم',
  clear: 'مسح',
  weekHeader: 'أسبوع',
  dateFormat: 'dd/mm/yy',
  weak: 'ضعيف',
  medium: 'متوسط',
  strong: 'قوي',
  passwordPrompt: 'أدخل كلمة المرور',
  emptyMessage: 'لا توجد نتائج',
  emptyFilterMessage: 'لا توجد نتائج',
};

const PRIMENG_LOCALES: Record<string, object> = {
  en: PRIMENG_LOCALE_EN,
  ar: PRIMENG_LOCALE_AR,
};

// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'lang';
const DEFAULT_LANG = 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  private primeng = inject(PrimeNG);

  readonly languages: Language[] = [
    { code: 'en', label: 'English', dir: 'ltr' },
    { code: 'ar', label: 'العربية', dir: 'rtl' },
  ];

  readonly currentLang = signal<string>(this.getSavedLang());

  constructor() {
    this.setLanguage(this.currentLang());
  }

  setLanguage(code: string): void {
    const lang = this.languages.find((l) => l.code === code) ?? this.languages[0];

    // ngx-translate
    this.translate.use(lang.code);

    // PrimeNG components (datepicker day/month names, Today, Clear, …)
    this.primeng.setTranslation(PRIMENG_LOCALES[lang.code] ?? PRIMENG_LOCALE_EN);

    // HTML dir / lang attributes for full RTL layout
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = lang.code;

    localStorage.setItem(STORAGE_KEY, lang.code);
    this.currentLang.set(lang.code);
  }

  currentLangLabel(): string {
    return this.languages.find((l) => l.code === this.currentLang())?.label ?? '';
  }

  private getSavedLang(): string {
    const saved = localStorage.getItem(STORAGE_KEY);
    return this.languages.some((l) => l.code === saved) ? saved! : DEFAULT_LANG;
  }
}

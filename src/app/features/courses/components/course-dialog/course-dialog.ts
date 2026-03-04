import {
  Component, DestroyRef, computed, effect, inject, input, model, output, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { FormField } from '@/shared/components/form-field/form-field';
import { CoursesService } from '@/features/courses/services/courses.service';
import { TeachersService } from '@/features/teachers/services/teachers.service';
import { Course } from '@/features/courses/models/course.model';
import { Teacher } from '@/features/teachers/models/teacher.model';
import { LanguageService } from '@/core/services/language.service';
import { SelectOption } from '@/core/models/form-field.model';
import { environment } from '@env/environment';

interface Category { id: string; labelEn: string; labelAr: string; }

@Component({
  selector: 'app-course-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, DialogModule, ButtonModule, FormField],
  templateUrl: './course-dialog.html',
  styleUrl:    './course-dialog.scss',
})
export class CourseDialog {
  private readonly fb         = inject(FormBuilder);
  private readonly svc        = inject(CoursesService);
  private readonly teacherSvc = inject(TeachersService);
  private readonly http       = inject(HttpClient);
  private readonly msgSvc     = inject(MessageService);
  private readonly translate  = inject(TranslateService);
  private readonly langSvc    = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible      = model.required<boolean>();
  readonly course       = input<Course | null>(null);
  readonly saved        = output<void>();
  readonly saving       = signal(false);
  readonly minDateForEnd = signal<Date | undefined>(undefined);

  get isEditMode(): boolean { return !!this.course(); }

  // ── Raw data signals (loaded once on first open) ─────────────────────────
  private readonly rawTeachers   = signal<Teacher[]>([]);
  private readonly rawCategories = signal<Category[]>([]);

  // ── Computed option lists (re-translated on language change) ─────────────
  readonly teacherOptions = computed<SelectOption<number>[]>(() => {
    const lang = this.langSvc.currentLang();
    return this.rawTeachers().map(t => ({
      label: lang === 'ar'
        ? `${t.firstNameAr} ${t.lastNameAr}`
        : `${t.firstNameEn} ${t.lastNameEn}`,
      value: Number(t.id),
    }));
  });

  readonly categoryOptions = computed<SelectOption<string>[]>(() => {
    const lang = this.langSvc.currentLang();
    return this.rawCategories().map(cat => ({
      label: lang === 'ar' ? cat.labelAr : cat.labelEn,
      value: cat.id,
    }));
  });

  get levelOptions(): SelectOption<string>[] {
    this.langSvc.currentLang();
    return [
      { label: this.translate.instant('COURSES.LEVEL_BEGINNER'),     value: 'Beginner'     },
      { label: this.translate.instant('COURSES.LEVEL_INTERMEDIATE'), value: 'Intermediate' },
      { label: this.translate.instant('COURSES.LEVEL_ADVANCED'),     value: 'Advanced'     },
    ];
  }

  get statusOptions(): SelectOption<string>[] {
    this.langSvc.currentLang();
    return [
      { label: this.translate.instant('COURSES.STATUS_ACTIVE'),    value: 'active'    },
      { label: this.translate.instant('COURSES.STATUS_UPCOMING'),  value: 'upcoming'  },
      { label: this.translate.instant('COURSES.STATUS_COMPLETED'), value: 'completed' },
      { label: this.translate.instant('COURSES.STATUS_CANCELLED'), value: 'cancelled' },
    ];
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    titleEn:       new FormControl('', [Validators.required, Validators.minLength(3)]),
    titleAr:       new FormControl('', [Validators.required, Validators.minLength(3)]),
    code:          new FormControl('', [Validators.required, Validators.minLength(2)]),
    categoryId:    new FormControl<string>('', Validators.required),
    level:         new FormControl<string>('', Validators.required),
    durationHours: new FormControl<number>(10, [Validators.required, Validators.min(1)]),
    startDate:     new FormControl('', Validators.required),
    endDate:       new FormControl('', Validators.required),
    teacherId:     new FormControl<number | null>(null, Validators.required),
    status:        new FormControl<string>('active', Validators.required),
    seatsTotal:    new FormControl<number>(20, [Validators.required, Validators.min(1)]),
    price:         new FormControl<number>(0, [Validators.required, Validators.min(0)]),
    summaryEn:     new FormControl(''),
    summaryAr:     new FormControl(''),
  });

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const c = this.course();
      if (!isVisible) return;

      this.saving.set(false);
      this.minDateForEnd.set(undefined);

      // Load lookup data (teachers + categories) each time dialog opens
      forkJoin({
        teachers:   this.teacherSvc.getAll(),
        categories: this.http.get<Category[]>(`${environment.API_BASE_URL}/categories`),
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ teachers, categories }) => {
        this.rawTeachers.set(teachers);
        this.rawCategories.set(categories);
      });

      if (c) {
        this.form.patchValue({ ...c, teacherId: Number(c.teacherId) });
        this.form.markAsPristine();
        this.form.markAsUntouched();
        // Seed minDateForEnd when editing an existing course
        this.validateDateRange();
      } else {
        this.form.reset({ status: 'active', seatsTotal: 20, price: 0, durationHours: 10 });
      }
    });

    // ── Cross-field date validation ───────────────────────────────────────────
    this.form.controls.startDate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.validateDateRange());

    this.form.controls.endDate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.validateDateRange());
  }

  /** Normalises a Date object or ISO string to a Date; returns null otherwise. */
  private toDate(v: unknown): Date | null {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
    return null;
  }

  /**
   * Updates minDateForEnd and sets/clears the endDateBeforeStart error on the
   * endDate control whenever either date field changes.
   */
  private validateDateRange(): void {
    const start   = this.toDate(this.form.controls.startDate.value);
    const endCtrl = this.form.controls.endDate;
    const end     = this.toDate(endCtrl.value);

    // Keep the end-date picker's minDate one day ahead of startDate
    if (start) {
      const nextDay = new Date(start);
      nextDay.setDate(nextDay.getDate() + 1);
      this.minDateForEnd.set(nextDay);
    } else {
      this.minDateForEnd.set(undefined);
    }

    // Apply / remove cross-field error without re-triggering valueChanges
    const hasRangeError = !!(start && end && end <= start);
    const currentErrors = { ...(endCtrl.errors ?? {}) };

    if (hasRangeError) {
      currentErrors['endDateBeforeStart'] = {
        message: this.translate.instant('FORM.ERRORS.END_DATE_BEFORE_START'),
      };
      endCtrl.setErrors(currentErrors);
    } else if (currentErrors['endDateBeforeStart']) {
      delete currentErrors['endDateBeforeStart'];
      endCtrl.setErrors(Object.keys(currentErrors).length ? currentErrors : null);
    }
  }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const course = this.course();
    const raw    = this.form.getRawValue();
    const body: Partial<Course> = {
      ...raw,
      teacherId:     raw.teacherId    ?? 0,
      durationHours: Number(raw.durationHours),
      seatsTotal:    Number(raw.seatsTotal),
      seatsTaken:    course?.seatsTaken ?? 0,
      price:         Number(raw.price),
    } as Partial<Course>;

    const op$ = course
      ? this.svc.update(course.id, body)
      : this.svc.create(body);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.msgSvc.add({
          severity: 'success',
          summary:  this.translate.instant('COMMON.SUCCESS'),
          detail:   this.translate.instant(
            course ? 'COURSES.MSG.UPDATE_SUCCESS' : 'COURSES.MSG.CREATE_SUCCESS',
          ),
          life: 3000,
        });
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit();
      },
      error: () => {
        this.msgSvc.add({
          severity: 'error',
          summary:  this.translate.instant('COMMON.ERROR'),
          detail:   this.translate.instant(
            course ? 'COURSES.MSG.UPDATE_ERROR' : 'COURSES.MSG.CREATE_ERROR',
          ),
          life: 5000,
        });
        this.saving.set(false);
      },
    });
  }

  onCancel(): void { this.visible.set(false); }
  onHide():   void { this.saving.set(false);  }
}

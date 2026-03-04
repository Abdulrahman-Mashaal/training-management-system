import {
  Component, DestroyRef, effect, inject, input, model, output, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { FormField } from '@/shared/components/form-field/form-field';
import { SchedulesService } from '@/features/courses/services/schedules.service';
import { Schedule } from '@/features/courses/models/schedule.model';

@Component({
  selector: 'app-schedule-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, DialogModule, ButtonModule, FormField],
  templateUrl: './schedule-dialog.html',
  styleUrl:    './schedule-dialog.scss',
})
export class ScheduleDialog {
  private readonly fb         = inject(FormBuilder);
  private readonly svc        = inject(SchedulesService);
  private readonly msgSvc     = inject(MessageService);
  private readonly translate  = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible  = model.required<boolean>();
  readonly schedule = input<Schedule | null>(null);
  readonly courseId = input.required<number>();
  readonly saved    = output<void>();
  readonly saving   = signal(false);

  /** Used as [minDate] on the datepicker to disallow past dates */
  readonly today = new Date();

  get isEditMode(): boolean { return !!this.schedule(); }

  // ── Form ──────────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    date:      new FormControl('', Validators.required),
    startTime: new FormControl('', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]),
    endTime:   new FormControl('', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]),
    room:      new FormControl('', Validators.required),
    notes:     new FormControl(''),
  });

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const s = this.schedule();
      if (!isVisible) return;

      this.saving.set(false);
      if (s) {
        // The datepicker control expects a Date object, but the model stores
        // date as an ISO string ("YYYY-MM-DD"). Append a local-time suffix to
        // avoid the UTC midnight → previous day shift on date-only strings.
        const dateObj = s.date ? new Date(s.date + 'T00:00:00') : null;
        // patchValue expects string for `date`, but at runtime the datepicker
        // CVA accepts a Date object — cast via unknown to satisfy TypeScript.
        this.form.patchValue({ ...s, date: dateObj as unknown as string });
        this.form.markAsPristine();
        this.form.markAsUntouched();
      } else {
        this.form.reset();
      }
    });
  }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const sched = this.schedule();
    const raw   = this.form.getRawValue();

    // The datepicker emits a Date object; convert back to "YYYY-MM-DD" string.
    const rawDate = raw.date as unknown;
    const dateStr = rawDate instanceof Date
      ? (rawDate as Date).toISOString().slice(0, 10)
      : (rawDate as string | null | undefined) ?? '';

    const body = {
      ...raw,
      date: dateStr,
      courseId: this.courseId(),
    } as unknown as Partial<Schedule>;

    const op$ = sched
      ? this.svc.update(sched.id, body)
      : this.svc.create(body);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.msgSvc.add({
          severity: 'success',
          summary:  this.translate.instant('COMMON.SUCCESS'),
          detail:   this.translate.instant(
            sched ? 'COURSES.SCHEDULE.UPDATE_SUCCESS' : 'COURSES.SCHEDULE.CREATE_SUCCESS',
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
            sched ? 'COURSES.SCHEDULE.UPDATE_ERROR' : 'COURSES.SCHEDULE.CREATE_ERROR',
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

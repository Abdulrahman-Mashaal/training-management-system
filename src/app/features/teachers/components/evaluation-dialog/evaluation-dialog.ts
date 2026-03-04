import {
  Component, DestroyRef, effect, inject, input, model, output, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { RatingModule } from 'primeng/rating';

import { FormField } from '@/shared/components/form-field/form-field';
import { EvaluationsService } from '@/features/teachers/services/evaluations.service';
import { Evaluation } from '@/features/teachers/models/evaluation.model';

@Component({
  selector: 'app-evaluation-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    RatingModule,
    FormField,
  ],
  templateUrl: './evaluation-dialog.html',
  styleUrl:    './evaluation-dialog.scss',
})
export class EvaluationDialog {
  private readonly fb         = inject(FormBuilder);
  private readonly svc        = inject(EvaluationsService);
  private readonly msgSvc     = inject(MessageService);
  private readonly translate  = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Two-way binding: [(visible)] ─────────────────────────────────────────
  readonly visible = model.required<boolean>();

  // null = Add mode, Evaluation = Edit mode
  readonly evaluation = input<Evaluation | null>(null);

  // Required: the teacher this evaluation belongs to
  readonly teacherId = input.required<string>();

  // Emitted after save so the parent can refresh its list
  readonly saved = output<void>();

  readonly saving = signal<boolean>(false);

  get isEditMode(): boolean { return !!this.evaluation(); }

  // ── Form ──────────────────────────────────────────────────────────────────
  // `date` is intentionally excluded — it is auto-set to today on create and
  // preserved from the original record on edit (not user-editable).
  readonly form = this.fb.group({
    reviewerName: new FormControl('', [Validators.required, Validators.minLength(2)]),
    rating:       new FormControl<number>(5, [Validators.required, Validators.min(1), Validators.max(5)]),
    comment:      new FormControl('', [Validators.required, Validators.minLength(5)]),
  });

  // ── Patch / reset on every open ───────────────────────────────────────────
  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const e         = this.evaluation();

      if (!isVisible) return;   // dialog closing — nothing to do

      this.saving.set(false);
      if (e) {
        this.form.patchValue({ reviewerName: e.reviewerName, rating: e.rating, comment: e.comment });
        this.form.markAsPristine();
        this.form.markAsUntouched();
      } else {
        this.form.reset({ rating: 5 });
      }
    });
  }

  // ── Save (create or update) ───────────────────────────────────────────────
  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const raw   = this.form.getRawValue();
    const eval_ = this.evaluation();

    // Auto-set date: today (ISO "YYYY-MM-DD") for new records, original date for edits.
    const date = eval_?.date ?? new Date().toISOString().slice(0, 10);

    const body: Partial<Evaluation> = {
      reviewerName: raw.reviewerName ?? '',
      rating:       raw.rating ?? 5,
      comment:      raw.comment ?? '',
      date,
      teacherId:    this.teacherId(),
    };

    const op$ = eval_
      ? this.svc.update(eval_.id, body)
      : this.svc.create(body);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.msgSvc.add({
          severity: 'success',
          summary:  this.translate.instant('COMMON.SUCCESS'),
          detail:   this.translate.instant(
            eval_
              ? 'TEACHERS.EVALUATION.UPDATE_SUCCESS'
              : 'TEACHERS.EVALUATION.CREATE_SUCCESS',
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
            eval_
              ? 'TEACHERS.EVALUATION.UPDATE_ERROR'
              : 'TEACHERS.EVALUATION.CREATE_ERROR',
          ),
          life: 5000,
        });
        this.saving.set(false);
      },
    });
  }

  onCancel(): void { this.visible.set(false); }

  // Form patch/reset on next open is handled by the effect above.
  onHide(): void { this.saving.set(false); }
}

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
import { StudentsService } from '@/features/students/services/students.service';
import { Student } from '@/features/students/models/student.model';
import { LanguageService } from '@/core/services/language.service';
import { AppValidators } from '@/core/validators/app-validators';
import { SelectOption } from '@/core/models/form-field.model';

@Component({
  selector: 'app-student-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, DialogModule, ButtonModule, FormField],
  templateUrl: './student-dialog.html',
  styleUrl: './student-dialog.scss',
})
export class StudentDialog {
  private readonly fb         = inject(FormBuilder);
  private readonly svc        = inject(StudentsService);
  private readonly msgSvc     = inject(MessageService);
  private readonly translate  = inject(TranslateService);
  private readonly langSvc    = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Two-way binding: [(visible)] ─────────────────────────────────────────
  // model() generates both an input signal AND a visibleChange output,
  // satisfying Angular's [(visible)] shorthand in the parent template.
  readonly visible = model.required<boolean>();

  // null = Add mode, Student object = Edit mode
  readonly student = input<Student | null>(null);

  // Emitted after a successful save so the parent can refresh its data
  readonly saved = output<void>();

  readonly saving = signal<boolean>(false);

  get isEditMode(): boolean { return !!this.student(); }

  // ── Status dropdown (re-translated on language change) ───────────────────
  get computedStatusOptions(): SelectOption<string>[] {
    this.langSvc.currentLang(); // declare reactive dependency when called from template
    return [
      { label: this.translate.instant('STUDENTS.STATUS_ACTIVE'),   value: 'active'   },
      { label: this.translate.instant('STUDENTS.STATUS_INACTIVE'), value: 'inactive' },
    ];
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    firstNameEn: new FormControl('', [Validators.required, Validators.minLength(2), AppValidators.englishOnly()]),
    firstNameAr: new FormControl('', [Validators.required, Validators.minLength(2), AppValidators.arabicOnly()]),
    lastNameEn:  new FormControl('', [Validators.required, Validators.minLength(2), AppValidators.englishOnly()]),
    lastNameAr:  new FormControl('', [Validators.required, Validators.minLength(2), AppValidators.arabicOnly()]),
    email:       new FormControl('', [Validators.required, Validators.email]),
    phone:       new FormControl('', [Validators.required, AppValidators.phone()]),
    status:      new FormControl<'active' | 'inactive'>('active', Validators.required),
  });

  // ── Patch / reset form on every open ─────────────────────────────────────
  //
  // The effect reads BOTH visible() AND student() as reactive dependencies.
  // This ensures it re-runs whenever the dialog opens — even when the same
  // student reference is passed again (e.g. close → reopen the same row),
  // which would NOT re-trigger an effect that only depends on student().
  //
  // Guard: return early when closing so the form isn't disturbed mid-animation.
  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const s         = this.student();

      if (!isVisible) return;   // dialog closing — nothing to do

      this.saving.set(false);
      if (s) {
        this.form.patchValue(s);
        this.form.markAsPristine();
        this.form.markAsUntouched();
      } else {
        this.form.reset({ status: 'active' });
      }
    });
  }

  // ── Save (create or update) ───────────────────────────────────────────────
  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const student = this.student();
    const op$ = student
      ? this.svc.update(student.id, this.form.getRawValue() as Partial<Student>)
      : this.svc.create(this.form.getRawValue() as Partial<Student>);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.msgSvc.add({
          severity: 'success',
          summary:  this.translate.instant('COMMON.SUCCESS'),
          detail:   this.translate.instant(
            student ? 'STUDENTS.MSG.UPDATE_SUCCESS' : 'STUDENTS.MSG.CREATE_SUCCESS',
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
            student ? 'STUDENTS.MSG.UPDATE_ERROR' : 'STUDENTS.MSG.CREATE_ERROR',
          ),
          life: 5000,
        });
        this.saving.set(false);
      },
    });
  }

  onCancel(): void { this.visible.set(false); }

  // Form patch/reset on the next open is handled by the effect above.
  onHide(): void { this.saving.set(false); }
}

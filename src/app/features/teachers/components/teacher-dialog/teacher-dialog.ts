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
import { TeachersService } from '@/features/teachers/services/teachers.service';
import { Teacher } from '@/features/teachers/models/teacher.model';
import { LanguageService } from '@/core/services/language.service';
import { AppValidators } from '@/core/validators/app-validators';
import { SelectOption } from '@/core/models/form-field.model';

@Component({
  selector: 'app-teacher-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DialogModule,
    ButtonModule,
    FormField,
  ],
  templateUrl: './teacher-dialog.html',
  styleUrl:    './teacher-dialog.scss',
})
export class TeacherDialog {
  private readonly fb         = inject(FormBuilder);
  private readonly svc        = inject(TeachersService);
  private readonly msgSvc     = inject(MessageService);
  private readonly translate  = inject(TranslateService);
  private readonly langSvc    = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Two-way binding: [(visible)] ─────────────────────────────────────────
  readonly visible = model.required<boolean>();

  // null = Add mode, Teacher = Edit mode
  readonly teacher = input<Teacher | null>(null);

  // Emitted after save so the parent can refresh its data
  readonly saved = output<void>();

  readonly saving = signal<boolean>(false);

  get isEditMode(): boolean { return !!this.teacher(); }

  // ── Status dropdown (re-translated on language change) ───────────────────
  get computedStatusOptions(): SelectOption<string>[] {
    this.langSvc.currentLang(); // reactive dependency
    return [
      { label: this.translate.instant('TEACHERS.STATUS_ACTIVE'),   value: 'active'   },
      { label: this.translate.instant('TEACHERS.STATUS_INACTIVE'), value: 'inactive' },
    ];
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    firstNameEn:  new FormControl('', [Validators.required, Validators.minLength(2), AppValidators.englishOnly()]),
    firstNameAr:  new FormControl('', [Validators.required, Validators.minLength(2), AppValidators.arabicOnly()]),
    lastNameEn:   new FormControl('', [Validators.required, Validators.minLength(2), AppValidators.englishOnly()]),
    lastNameAr:   new FormControl('', [Validators.required, Validators.minLength(2), AppValidators.arabicOnly()]),
    departmentEn: new FormControl('', [Validators.required, Validators.minLength(2), AppValidators.englishOnly()]),
    departmentAr: new FormControl('', [Validators.required, Validators.minLength(2), AppValidators.arabicOnly()]),
    email:        new FormControl('', [Validators.required, Validators.email]),
    phone:        new FormControl('', [Validators.required, AppValidators.phone()]),
    bioEn:        new FormControl('', [Validators.required, Validators.minLength(10)]),
    bioAr:        new FormControl('', [Validators.required, Validators.minLength(10)]),
    status:       new FormControl<'active' | 'inactive'>('active', Validators.required),
    specialties:  new FormControl<string[]>([]),
  });

  // ── Patch / reset form on every open ─────────────────────────────────────
  //
  // Reads BOTH visible() AND teacher() as reactive dependencies so the effect
  // re-runs on every open — even when the same teacher row is re-opened after
  // closing (same reference → signal value unchanged → only visible() change
  // triggers re-run). Guard: return early on close so form isn't disturbed.
  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const t         = this.teacher();

      if (!isVisible) return;   // dialog closing — nothing to do

      this.saving.set(false);
      if (t) {
        this.form.patchValue(t);
        this.form.markAsPristine();
        this.form.markAsUntouched();
      } else {
        this.form.reset({ status: 'active', specialties: [] });
      }
    });
  }

  // ── Save (create or update) ───────────────────────────────────────────────
  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const teacher = this.teacher();
    const op$ = teacher
      ? this.svc.update(teacher.id, this.form.getRawValue() as Partial<Teacher>)
      : this.svc.create(this.form.getRawValue() as Partial<Teacher>);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.msgSvc.add({
          severity: 'success',
          summary:  this.translate.instant('COMMON.SUCCESS'),
          detail:   this.translate.instant(
            teacher ? 'TEACHERS.MSG.UPDATE_SUCCESS' : 'TEACHERS.MSG.CREATE_SUCCESS',
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
            teacher ? 'TEACHERS.MSG.UPDATE_ERROR' : 'TEACHERS.MSG.CREATE_ERROR',
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

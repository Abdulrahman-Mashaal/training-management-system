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
import { MaterialsService } from '@/features/courses/services/materials.service';
import { Material, MaterialType } from '@/features/courses/models/material.model';
import { LanguageService } from '@/core/services/language.service';
import { SelectOption } from '@/core/models/form-field.model';

@Component({
  selector: 'app-material-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, DialogModule, ButtonModule, FormField],
  templateUrl: './material-dialog.html',
  styleUrl:    './material-dialog.scss',
})
export class MaterialDialog {
  private readonly fb         = inject(FormBuilder);
  private readonly svc        = inject(MaterialsService);
  private readonly msgSvc     = inject(MessageService);
  private readonly translate  = inject(TranslateService);
  private readonly langSvc    = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible  = model.required<boolean>();
  readonly material = input<Material | null>(null);
  readonly courseId = input.required<number>();
  readonly saved    = output<void>();
  readonly saving   = signal(false);

  get isEditMode(): boolean { return !!this.material(); }

  get typeOptions(): SelectOption<MaterialType>[] {
    this.langSvc.currentLang();
    return [
      { label: this.translate.instant('COURSES.MATERIAL.TYPE_PDF'),      value: 'PDF'      },
      { label: this.translate.instant('COURSES.MATERIAL.TYPE_VIDEO'),    value: 'Video'    },
      { label: this.translate.instant('COURSES.MATERIAL.TYPE_LINK'),     value: 'Link'     },
      { label: this.translate.instant('COURSES.MATERIAL.TYPE_DOCUMENT'), value: 'Document' },
    ];
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    titleEn:        new FormControl('', [Validators.required, Validators.minLength(3)]),
    titleAr:        new FormControl('', [Validators.required, Validators.minLength(3)]),
    type:           new FormControl<MaterialType>('PDF', Validators.required),
    url:            new FormControl('', [Validators.required, Validators.minLength(3)]),
    descriptionEn:  new FormControl(''),
    descriptionAr:  new FormControl(''),
    order:          new FormControl<number>(1, [Validators.required, Validators.min(1)]),
  });

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const m = this.material();
      if (!isVisible) return;

      this.saving.set(false);
      if (m) {
        this.form.patchValue(m);
        this.form.markAsPristine();
        this.form.markAsUntouched();
      } else {
        this.form.reset({ type: 'PDF', order: 1 });
      }
    });
  }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const mat = this.material();
    const raw = this.form.getRawValue();
    const body = {
      ...raw,
      courseId: this.courseId(),
      order: Number(raw.order),
    } as unknown as Partial<Material>;

    const op$ = mat
      ? this.svc.update(mat.id, body)
      : this.svc.create(body);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.msgSvc.add({
          severity: 'success',
          summary:  this.translate.instant('COMMON.SUCCESS'),
          detail:   this.translate.instant(
            mat ? 'COURSES.MATERIAL.UPDATE_SUCCESS' : 'COURSES.MATERIAL.CREATE_SUCCESS',
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
            mat ? 'COURSES.MATERIAL.UPDATE_ERROR' : 'COURSES.MATERIAL.CREATE_ERROR',
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

import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { switchMap, catchError, EMPTY, forkJoin } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { RatingModule } from 'primeng/rating';

import { TeachersService } from '@/features/teachers/services/teachers.service';
import { EvaluationsService } from '@/features/teachers/services/evaluations.service';
import { CoursesService } from '@/features/courses/services/courses.service';
import { TeacherDialog } from '@/features/teachers/components/teacher-dialog/teacher-dialog';
import { EvaluationDialog } from '@/features/teachers/components/evaluation-dialog/evaluation-dialog';
import { Teacher } from '@/features/teachers/models/teacher.model';
import { Evaluation } from '@/features/teachers/models/evaluation.model';
import { Course } from '@/features/courses/models/course.model';
import { LanguageService } from '@/core/services/language.service';

@Component({
  selector: 'app-page-detail',
  imports: [
    FormsModule,
    TranslatePipe,
    RouterLink,
    ButtonModule,
    TagModule,
    SkeletonModule,
    RatingModule,
    TeacherDialog,
    EvaluationDialog,
  ],
  templateUrl: './page-detail.html',
  styleUrl: './page-detail.scss',
})
export class PageDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(TeachersService);
  private readonly evalSvc = inject(EvaluationsService);
  private readonly coursesSvc = inject(CoursesService);
  private readonly confirmSvc = inject(ConfirmationService);
  private readonly msgSvc = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly langSvc = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────────────────────
  readonly teacher = signal<Teacher | null>(null);
  readonly allCourses = signal<Course[]>([]);
  readonly evaluations = signal<Evaluation[]>([]);
  readonly loading = signal<boolean>(true);

  // Teacher edit dialog
  readonly editDialogVisible = signal<boolean>(false);

  // Evaluation CRUD dialog
  readonly evalDialogVisible = signal<boolean>(false);
  readonly editingEvaluation = signal<Evaluation | null>(null);
  readonly deletingEvalId = signal<number | null>(null);

  protected teacherId = '';

  // ── Computed display values ───────────────────────────────────────────────
  readonly isRtl = computed(() => this.langSvc.currentLang() === 'ar');
  readonly displayName = computed<string>(() => {
    const t = this.teacher();
    if (!t) return '';
    return this.isRtl()
      ? `${t.firstNameAr} ${t.lastNameAr}`
      : `${t.firstNameEn} ${t.lastNameEn}`;
  });

  readonly displayDepartment = computed<string>(() => {
    const t = this.teacher();
    if (!t) return '';
    return this.isRtl() ? t.departmentAr : t.departmentEn;
  });

  readonly displayBio = computed<string>(() => {
    const t = this.teacher();
    if (!t) return '';
    return this.isRtl() ? t.bioAr : t.bioEn;
  });

  /** Courses whose teacherId matches this teacher's id. */
  readonly assignedCourses = computed<Course[]>(() => {
    const t = this.teacher();
    if (!t) return [];
    const tid = Number(t.id);
    return this.allCourses().filter((c) => c.teacherId === tid);
  });

  /** Average rating from evaluations (rounded to 1 decimal). */
  readonly avgRating = computed<number>(() => {
    const evals = this.evaluations();
    if (!evals.length) return 0;
    const sum = evals.reduce((acc, e) => acc + e.rating, 0);
    return Math.round((sum / evals.length) * 10) / 10;
  });

  constructor() {
    // Load teacher + all courses + evaluations in parallel on route change
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.teacherId = params.get('id') ?? '';
          this.loading.set(true);
          return forkJoin({
            teacher: this.svc.getById(this.teacherId),
            courses: this.coursesSvc.getAll(),
            evaluations: this.evalSvc.getByTeacher(this.teacherId),
          }).pipe(
            catchError(() => {
              this.loading.set(false);
              // Teacher not found (404) or error — redirect back to the list
              this.router.navigate(['/teachers']);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ teacher, courses, evaluations }) => {
        this.teacher.set(teacher as Teacher);
        this.allCourses.set(courses as Course[]);
        this.evaluations.set(evaluations as Evaluation[]);
        this.loading.set(false);
      });
  }

  // ── Teacher edit ──────────────────────────────────────────────────────────

  /** Re-fetch the teacher record after the edit dialog saves. */
  onTeacherSaved(): void {
    this.svc
      .getById(this.teacherId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((t) => this.teacher.set(t as Teacher));
  }

  // ── Teacher delete ────────────────────────────────────────────────────────

  deleteTeacher(): void {
    const t = this.teacher();
    if (!t) return;

    const name =
      this.isRtl()
        ? `${t.firstNameAr} ${t.lastNameAr}`
        : `${t.firstNameEn} ${t.lastNameEn}`;

    this.confirmSvc.confirm({
      message: this.translate.instant('TEACHERS.MSG.DELETE_CONFIRM', { name }),
      header: this.translate.instant('TEACHERS.MSG.DELETE_TITLE'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('COMMON.DELETE'),
      rejectLabel: this.translate.instant('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.svc
          .delete(t.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.msgSvc.add({
                severity: 'success',
                summary: this.translate.instant('COMMON.SUCCESS'),
                detail: this.translate.instant('TEACHERS.MSG.DELETE_SUCCESS'),
                life: 3000,
              });
              this.router.navigate(['/teachers']);
            },
            error: () => {
              this.msgSvc.add({
                severity: 'error',
                summary: this.translate.instant('COMMON.ERROR'),
                detail: this.translate.instant('TEACHERS.MSG.DELETE_ERROR'),
                life: 5000,
              });
            },
          });
      },
    });
  }

  // ── Evaluation CRUD ───────────────────────────────────────────────────────

  openEvalDialog(evaluation: Evaluation | null = null): void {
    this.editingEvaluation.set(evaluation);
    this.evalDialogVisible.set(true);
  }

  /** Refresh evaluations list after add or edit. */
  onEvalSaved(): void {
    this.evalSvc
      .getByTeacher(this.teacherId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evals) => this.evaluations.set(evals as Evaluation[]));
  }

  deleteEvaluation(evaluation: Evaluation): void {
    this.confirmSvc.confirm({
      message: this.translate.instant('TEACHERS.EVALUATION.DELETE_CONFIRM'),
      header: this.translate.instant('TEACHERS.EVALUATION.DELETE_TITLE'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deletingEvalId.set(evaluation.id);
        this.evalSvc
          .delete(evaluation.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.deletingEvalId.set(null);
              this.msgSvc.add({
                severity: 'success',
                summary: this.translate.instant('COMMON.SUCCESS'),
                detail: this.translate.instant('TEACHERS.EVALUATION.DELETE_SUCCESS'),
                life: 3000,
              });
              this.evaluations.update((list) => list.filter((e) => e.id !== evaluation.id));
            },
            error: () => {
              this.deletingEvalId.set(null);
              this.msgSvc.add({
                severity: 'error',
                summary: this.translate.instant('COMMON.ERROR'),
                detail: this.translate.instant('TEACHERS.EVALUATION.DELETE_ERROR'),
                life: 5000,
              });
            },
          });
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getCourseDisplayName(course: Course): string {
    return this.isRtl() ? course.titleAr : course.titleEn;
  }

  getStatusSeverity(status: string): 'success' | 'secondary' {
    return status === 'active' ? 'success' : 'secondary';
  }
}

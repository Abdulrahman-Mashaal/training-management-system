import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap, catchError, EMPTY, forkJoin } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';

import { StudentsService } from '@/features/students/services/students.service';
import { CoursesService } from '@/features/courses/services/courses.service';
import { Student } from '@/features/students/models/student.model';
import { Course } from '@/features/courses/models/course.model';
import { LanguageService } from '@/core/services/language.service';
import { StudentDialog } from '@/features/students/components/student-dialog/student-dialog';

@Component({
  selector: 'app-page-detail',
  imports: [TranslatePipe, RouterLink, ButtonModule, TagModule, SkeletonModule, StudentDialog],
  templateUrl: './page-detail.html',
  styleUrl: './page-detail.scss',
})
export class PageDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(StudentsService);
  private readonly coursesSvc = inject(CoursesService);
  private readonly confirmSvc = inject(ConfirmationService);
  private readonly msgSvc = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly langSvc = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────────────────────
  readonly student = signal<Student | null>(null);
  readonly allCourses = signal<Course[]>([]);
  readonly loading = signal<boolean>(true);
  readonly dialogVisible = signal<boolean>(false);
  private studentId = 0;

  // ── Bilingual full name (recomputes on language change) ───────────────────
  readonly isRtl = computed(() => this.langSvc.currentLang() === 'ar');
  readonly displayName = computed<string>(() => {
    const s = this.student();
    if (!s) return '';
    return this.isRtl()
      ? `${s.firstNameAr} ${s.lastNameAr}`
      : `${s.firstNameEn} ${s.lastNameEn}`;
  });

  // ── Enrolled courses — computed from allCourses filtered by IDs ───────────
  //
  // Guards:
  //  1. `?? []`  — handles students created via dialog (no enrolledCourseIds field yet)
  //  2. `Number()` cast — normalises string/number ID mismatches that json-server
  //     can introduce when student ids are stored as strings ("101") but
  //     enrolledCourseIds entries are stored as numbers (1, 2)
  readonly enrolledCourses = computed<Course[]>(() => {
    const s = this.student();
    if (!s) return [];
    const ids = (s.enrolledCourseIds ?? []).map(Number);
    if (!ids.length) return [];
    return this.allCourses().filter((c) => ids.includes(Number(c.id)));
  });

  constructor() {
    // React to route param changes (direct URL entry, browser back/forward)
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.studentId = Number(params.get('id'));
          this.loading.set(true);
          return forkJoin({
            student: this.svc.getById(this.studentId),
            courses: this.coursesSvc.getAll(),
          }).pipe(
            catchError(() => {
              this.loading.set(false);
              // Student not found (404) or error — redirect back to the list
              this.router.navigate(['/students']);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ student, courses }) => {
        this.student.set(student as Student);
        this.allCourses.set(courses as Course[]);
        this.loading.set(false);
      });
  }

  // ── After dialog saves: re-fetch only the student to refresh display ──────
  onSaved(): void {
    this.svc
      .getById(this.studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((s) => this.student.set(s as Student));
  }

  // ── Delete with PrimeNG confirmation overlay ──────────────────────────────
  deleteStudent(): void {
    const s = this.student();
    if (!s) return;

    const name =
      this.isRtl()
        ? `${s.firstNameAr} ${s.lastNameAr}`
        : `${s.firstNameEn} ${s.lastNameEn}`;

    this.confirmSvc.confirm({
      message: this.translate.instant('STUDENTS.MSG.DELETE_CONFIRM', { name }),
      header: this.translate.instant('STUDENTS.MSG.DELETE_TITLE'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('COMMON.DELETE'),
      rejectLabel: this.translate.instant('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.svc
          .delete(s.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.msgSvc.add({
                severity: 'success',
                summary: this.translate.instant('COMMON.SUCCESS'),
                detail: this.translate.instant('STUDENTS.MSG.DELETE_SUCCESS'),
                life: 3000,
              });
              this.router.navigate(['/students']);
            },
            error: () => {
              this.msgSvc.add({
                severity: 'error',
                summary: this.translate.instant('COMMON.ERROR'),
                detail: this.translate.instant('STUDENTS.MSG.DELETE_ERROR'),
                life: 5000,
              });
            },
          });
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getStatusSeverity(status: string): 'success' | 'secondary' {
    return status === 'active' ? 'success' : 'secondary';
  }

  getCourseDisplayName(course: Course): string {
    return this.isRtl() ? course.titleAr : course.titleEn;
  }
}

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
import { SelectModule } from 'primeng/select';

import { CoursesService } from '@/features/courses/services/courses.service';
import { SchedulesService } from '@/features/courses/services/schedules.service';
import { MaterialsService } from '@/features/courses/services/materials.service';
import { EnrollmentsService } from '@/features/courses/services/enrollments.service';
import { TeachersService } from '@/features/teachers/services/teachers.service';
import { StudentsService } from '@/features/students/services/students.service';
import { CourseDialog } from '@/features/courses/components/course-dialog/course-dialog';
import { ScheduleDialog } from '@/features/courses/components/schedule-dialog/schedule-dialog';
import { MaterialDialog } from '@/features/courses/components/material-dialog/material-dialog';
import { Course } from '@/features/courses/models/course.model';
import { Schedule } from '@/features/courses/models/schedule.model';
import { Material } from '@/features/courses/models/material.model';
import { Enrollment } from '@/features/courses/models/enrollment.model';
import { Teacher } from '@/features/teachers/models/teacher.model';
import { Student } from '@/features/students/models/student.model';
import { LanguageService } from '@/core/services/language.service';

import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-course-detail',
  imports: [
    FormsModule,
    TranslatePipe,
    RouterLink,
    ButtonModule,
    TagModule,
    SkeletonModule,
    SelectModule,
    TooltipModule,
    CourseDialog,
    ScheduleDialog,
    MaterialDialog,
  ],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
})
export class CourseDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly svc = inject(CoursesService);
  private readonly schedSvc = inject(SchedulesService);
  private readonly matSvc = inject(MaterialsService);
  private readonly enrSvc = inject(EnrollmentsService);
  private readonly teacherSvc = inject(TeachersService);
  private readonly studentSvc = inject(StudentsService);
  private readonly confirmSvc = inject(ConfirmationService);
  private readonly msgSvc = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly langSvc = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── State ─────────────────────────────────────────────────────────────────
  readonly course = signal<Course | null>(null);
  readonly teacher = signal<Teacher | null>(null);
  readonly schedules = signal<Schedule[]>([]);
  readonly materials = signal<Material[]>([]);
  readonly enrollments = signal<Enrollment[]>([]);
  readonly allStudents = signal<Student[]>([]);
  readonly loading = signal<boolean>(true);

  protected courseId = 0;

  // ── Course edit dialog ────────────────────────────────────────────────────
  readonly editDialogVisible = signal<boolean>(false);

  // ── Schedule dialog ───────────────────────────────────────────────────────
  readonly schedDialogVisible = signal<boolean>(false);
  readonly editingSchedule = signal<Schedule | null>(null);
  readonly deletingScheduleId = signal<number | null>(null);

  // ── Material dialog ───────────────────────────────────────────────────────
  readonly matDialogVisible = signal<boolean>(false);
  readonly editingMaterial = signal<Material | null>(null);
  readonly deletingMaterialId = signal<number | null>(null);

  // ── Enrollment state ──────────────────────────────────────────────────────
  readonly enrollingStudentId = signal<number | null>(null);
  readonly removingEnrollmentId = signal<number | null>(null);
  readonly selectedStudentId = signal<number | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  readonly isRtl = computed(() => this.langSvc.currentLang() === 'ar');
  readonly courseTitle = computed<string>(() => {
    const c = this.course();
    if (!c) return '';
    return this.isRtl() ? c.titleAr : c.titleEn;
  });

  readonly teacherName = computed<string>(() => {
    const t = this.teacher();
    if (!t) return '—';
    return this.isRtl()
      ? `${t.firstNameAr} ${t.lastNameAr}`
      : `${t.firstNameEn} ${t.lastNameEn}`;
  });

  readonly courseSummary = computed<string>(() => {
    const c = this.course();
    if (!c) return '';
    return this.isRtl() ? (c.summaryAr ?? '') : (c.summaryEn ?? '');
  });

  /** Students already enrolled — joined with student data.
   *  Use String() comparison: student.id is stored as "101" (string) in db.json
   *  while enrollment.studentId is stored as 101 (number) — always coerce both. */
  readonly enrolledStudents = computed<
    Array<{ enrollment: Enrollment; student: Student | undefined }>
  >(() => {
    const enrs = this.enrollments();
    const studs = this.allStudents();
    return enrs.map((e) => ({
      enrollment: e,
      student: studs.find((s) => String(s.id) === String(e.studentId)),
    }));
  });

  /** Students NOT yet enrolled, available for the enroll picker */
  readonly unenrolledStudents = computed<Student[]>(() => {
    const enrolledIds = new Set(this.enrollments().map((e) => String(e.studentId)));
    return this.allStudents().filter((s) => !enrolledIds.has(String(s.id)));
  });

  /** Options for the enroll dropdown — language-aware names */
  readonly enrollOptions = computed<{ label: string; value: number }[]>(() => {
    const isAr = this.langSvc.currentLang() === 'ar';
    return this.unenrolledStudents().map((s) => ({
      label: isAr ? `${s.firstNameAr} ${s.lastNameAr}` : `${s.firstNameEn} ${s.lastNameEn}`,
      value: Number(s.id),
    }));
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.courseId = Number(params.get('id') ?? 0);
          this.loading.set(true);
          return forkJoin({
            course: this.svc.getById(this.courseId),
            schedules: this.schedSvc.getByCourse(this.courseId),
            materials: this.matSvc.getByCourse(this.courseId),
            enrollments: this.enrSvc.getByCourse(this.courseId),
            students: this.studentSvc.getAll(),
          }).pipe(
            catchError(() => {
              this.loading.set(false);
              // Course not found (404) or error — redirect back to the list
              this.router.navigate(['/courses']);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ course, schedules, materials, enrollments, students }) => {
        const c = course as Course;
        this.course.set(c);
        this.schedules.set(schedules as Schedule[]);
        this.materials.set((materials as Material[]).sort((a, b) => a.order - b.order));
        this.enrollments.set(enrollments as Enrollment[]);
        this.allStudents.set(students as Student[]);
        this.loading.set(false);

        // Load teacher separately (needs course.teacherId)
        this.teacherSvc
          .getById(c.teacherId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((t) => this.teacher.set(t as Teacher));
      });
  }

  // ── Course edit ───────────────────────────────────────────────────────────
  onCourseSaved(): void {
    this.svc
      .getById(this.courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => this.course.set(c as Course));
  }

  // ── Schedule CRUD ─────────────────────────────────────────────────────────
  openScheduleDialog(schedule: Schedule | null = null): void {
    this.editingSchedule.set(schedule);
    this.schedDialogVisible.set(true);
  }

  onScheduleSaved(): void {
    this.schedSvc
      .getByCourse(this.courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((s) => this.schedules.set(s as Schedule[]));
  }

  deleteSchedule(schedule: Schedule): void {
    this.confirmSvc.confirm({
      message: this.translate.instant('COURSES.SCHEDULE.DELETE_CONFIRM'),
      header: this.translate.instant('COURSES.SCHEDULE.DELETE_TITLE'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('COMMON.DELETE'),
      rejectLabel: this.translate.instant('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.deletingScheduleId.set(schedule.id);
        this.schedSvc
          .delete(schedule.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.deletingScheduleId.set(null);
              this.msgSvc.add({
                severity: 'success',
                summary: this.translate.instant('COMMON.SUCCESS'),
                detail: this.translate.instant('COURSES.SCHEDULE.DELETE_SUCCESS'),
                life: 3000,
              });
              this.schedules.update((list) => list.filter((s) => s.id !== schedule.id));
            },
            error: () => {
              this.deletingScheduleId.set(null);
              this.msgSvc.add({
                severity: 'error',
                summary: this.translate.instant('COMMON.ERROR'),
                detail: this.translate.instant('COURSES.SCHEDULE.DELETE_ERROR'),
                life: 5000,
              });
            },
          });
      },
    });
  }

  // ── Material CRUD ─────────────────────────────────────────────────────────
  openMaterialDialog(material: Material | null = null): void {
    this.editingMaterial.set(material);
    this.matDialogVisible.set(true);
  }

  onMaterialSaved(): void {
    this.matSvc
      .getByCourse(this.courseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((m) => this.materials.set((m as Material[]).sort((a, b) => a.order - b.order)));
  }

  deleteMaterial(material: Material): void {
    this.confirmSvc.confirm({
      message: this.translate.instant('COURSES.MATERIAL.DELETE_CONFIRM'),
      header: this.translate.instant('COURSES.MATERIAL.DELETE_TITLE'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('COMMON.DELETE'),
      rejectLabel: this.translate.instant('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.deletingMaterialId.set(material.id);
        this.matSvc
          .delete(material.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.deletingMaterialId.set(null);
              this.msgSvc.add({
                severity: 'success',
                summary: this.translate.instant('COMMON.SUCCESS'),
                detail: this.translate.instant('COURSES.MATERIAL.DELETE_SUCCESS'),
                life: 3000,
              });
              this.materials.update((list) => list.filter((m) => m.id !== material.id));
            },
            error: () => {
              this.deletingMaterialId.set(null);
              this.msgSvc.add({
                severity: 'error',
                summary: this.translate.instant('COMMON.ERROR'),
                detail: this.translate.instant('COURSES.MATERIAL.DELETE_ERROR'),
                life: 5000,
              });
            },
          });
      },
    });
  }

  // ── Enrollment ────────────────────────────────────────────────────────────
  enrollStudent(): void {
    const studentId = this.selectedStudentId();
    if (!studentId) return;

    this.enrollingStudentId.set(studentId);
    const body: Partial<Enrollment> = {
      courseId: this.courseId,
      studentId: studentId,
      enrolledAt: new Date().toISOString().slice(0, 10),
      status: 'active',
    };

    this.enrSvc
      .create(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enrollingStudentId.set(null);
          this.selectedStudentId.set(null);
          this.msgSvc.add({
            severity: 'success',
            summary: this.translate.instant('COMMON.SUCCESS'),
            detail: this.translate.instant('COURSES.ENROLLMENT.ENROLL_SUCCESS'),
            life: 3000,
          });
          this.enrSvc
            .getByCourse(this.courseId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((e) => this.enrollments.set(e as Enrollment[]));
        },
        error: () => {
          this.enrollingStudentId.set(null);
          this.msgSvc.add({
            severity: 'error',
            summary: this.translate.instant('COMMON.ERROR'),
            detail: this.translate.instant('COURSES.ENROLLMENT.ENROLL_ERROR'),
            life: 5000,
          });
        },
      });
  }

  removeEnrollment(enrollment: Enrollment): void {
    this.confirmSvc.confirm({
      message: this.translate.instant('COURSES.ENROLLMENT.REMOVE_CONFIRM'),
      header: this.translate.instant('COURSES.ENROLLMENT.REMOVE_TITLE'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('COMMON.DELETE'),
      rejectLabel: this.translate.instant('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.removingEnrollmentId.set(enrollment.id);
        this.enrSvc
          .delete(enrollment.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.removingEnrollmentId.set(null);
              this.msgSvc.add({
                severity: 'success',
                summary: this.translate.instant('COMMON.SUCCESS'),
                detail: this.translate.instant('COURSES.ENROLLMENT.REMOVE_SUCCESS'),
                life: 3000,
              });
              this.enrollments.update((list) => list.filter((e) => e.id !== enrollment.id));
            },
            error: () => {
              this.removingEnrollmentId.set(null);
              this.msgSvc.add({
                severity: 'error',
                summary: this.translate.instant('COMMON.ERROR'),
                detail: this.translate.instant('COURSES.ENROLLMENT.REMOVE_ERROR'),
                life: 5000,
              });
            },
          });
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getStudentName(student?: Student): string {
    if (!student) return '—';
    return this.isRtl()
      ? `${student.firstNameAr} ${student.lastNameAr}`
      : `${student.firstNameEn} ${student.lastNameEn}`;
  }

  getMaterialIcon(type: string): string {
    const map: Record<string, string> = {
      pdf: 'pi pi-file-pdf',
      video: 'pi pi-video',
      link: 'pi pi-link',
      document: 'pi pi-file',
    };
    return map[type.toLowerCase()] || 'pi pi-file';
  }

  getMaterialTitle(material: Material): string {
    return this.isRtl() ? material.titleAr : material.titleEn;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'secondary' | 'warn' | 'danger' {
    const map: Record<string, 'success' | 'info' | 'secondary' | 'warn' | 'danger'> = {
      active: 'success',
      upcoming: 'info',
      completed: 'secondary',
      cancelled: 'danger',
    };
    return map[status] ?? 'secondary';
  }

  getLevelSeverity(level: string): 'success' | 'info' | 'warn' {
    const map: Record<string, 'success' | 'info' | 'warn'> = {
      Beginner: 'success',
      Intermediate: 'info',
      Advanced: 'warn',
    };
    return map[level] ?? 'info';
  }
}

import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgClass, SlicePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import { CoursesService } from '@/features/courses/services/courses.service';
import { TeachersService } from '@/features/teachers/services/teachers.service';
import { StudentsService } from '@/features/students/services/students.service';
import { EnrollmentsService } from '@/features/courses/services/enrollments.service';
import { SchedulesService } from '@/features/courses/services/schedules.service';
import { LanguageService } from '@/core/services/language.service';
import { Course } from '@/features/courses/models/course.model';
import { Teacher } from '@/features/teachers/models/teacher.model';
import { Student } from '@/features/students/models/student.model';
import { Enrollment } from '@/features/courses/models/enrollment.model';
import { Schedule } from '@/features/courses/models/schedule.model';

// ── Local types ────────────────────────────────────────────────────────────
interface UpcomingSession extends Schedule {
  course: Course | null;
  isToday: boolean;
}

interface FillRateItem {
  course: Course;
  title: string;
  percent: number;
}

@Component({
  selector: 'app-dashboard-home',
  imports: [NgClass, SlicePipe, RouterLink, TranslatePipe, ButtonModule, SkeletonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome {
  // ── Services ───────────────────────────────────────────────────────────────
  private readonly coursesSvc = inject(CoursesService);
  private readonly teachersSvc = inject(TeachersService);
  private readonly studentsSvc = inject(StudentsService);
  private readonly enrollmentsSvc = inject(EnrollmentsService);
  private readonly schedulesSvc = inject(SchedulesService);
  protected readonly langSvc = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Raw data signals ───────────────────────────────────────────────────────
  readonly courses = signal<Course[]>([]);
  readonly teachers = signal<Teacher[]>([]);
  readonly students = signal<Student[]>([]);
  readonly enrollments = signal<Enrollment[]>([]);
  readonly schedules = signal<Schedule[]>([]);
  readonly loading = signal<boolean>(true);

  // ── KPI Totals ─────────────────────────────────────────────────────────────
  readonly totalCourses = computed(() => this.courses().length);
  readonly totalTeachers = computed(() => this.teachers().length);
  readonly totalStudents = computed(() => this.students().length);
  readonly totalEnrollments = computed(() => this.enrollments().length);

  // ── Course status breakdown ────────────────────────────────────────────────
  readonly activeCourses = computed(() => this.courses().filter((c) => c.status === 'active'));
  readonly upcomingCourses = computed(() => this.courses().filter((c) => c.status === 'upcoming'));
  readonly completedCourses = computed(() =>
    this.courses().filter((c) => c.status === 'completed'),
  );

  readonly activeCount = computed(() => this.activeCourses().length);
  readonly upcomingCount = computed(() => this.upcomingCourses().length);
  readonly completedCount = computed(() => this.completedCourses().length);

  readonly activePercent = computed(() =>
    this.totalCourses() ? Math.round((this.activeCount() / this.totalCourses()) * 100) : 0,
  );
  readonly upcomingPercent = computed(() =>
    this.totalCourses() ? Math.round((this.upcomingCount() / this.totalCourses()) * 100) : 0,
  );
  readonly completedPercent = computed(() =>
    this.totalCourses() ? Math.round((this.completedCount() / this.totalCourses()) * 100) : 0,
  );

  // ── Upcoming sessions (today + future, sorted by date, top 5) ─────────────
  private readonly todayStr = new Date().toISOString().slice(0, 10);

  readonly upcomingSessions = computed<UpcomingSession[]>(() => {
    const today = this.todayStr;
    return this.schedules()
      .filter((s) => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 5)
      .map((s) => ({
        ...s,
        course: this.courses().find((c) => Number(c.id) === Number(s.courseId)) ?? null,
        isToday: s.date === today,
      }));
  });

  // ── Enrollment fill rate — active courses sorted by %, top 6 ─────────────
  readonly fillRates = computed<FillRateItem[]>(() =>
    this.activeCourses()
      .map((c) => ({
        course: c,
        title: this.langSvc.currentLang() === 'ar' ? c.titleAr : c.titleEn,
        percent: c.seatsTotal > 0 ? Math.round((c.seatsTaken / c.seatsTotal) * 100) : 0,
      }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 6),
  );

  // ── Greeting key (time-of-day aware) ──────────────────────────────────────
  readonly greetingKey = computed<string>(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'HOME.GREETING_MORNING';
    if (hour < 17) return 'HOME.GREETING_AFTERNOON';
    return 'HOME.GREETING_EVENING';
  });

  // ── Today's date formatted in the current locale ───────────────────────────
  readonly todayFormatted = computed<string>(() => {
    const locale = this.langSvc.currentLang() === 'ar' ? 'ar-EG' : 'en-US';
    return new Date().toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // ── Data load ──────────────────────────────────────────────────────────────
  constructor() {
    forkJoin({
      courses: this.coursesSvc.getAll(),
      teachers: this.teachersSvc.getAll(),
      students: this.studentsSvc.getAll(),
      enrollments: this.enrollmentsSvc.getAll(),
      schedules: this.schedulesSvc.getAll(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.courses.set(data.courses);
          this.teachers.set(data.teachers);
          this.students.set(data.students);
          this.enrollments.set(data.enrollments);
          this.schedules.set(data.schedules);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Tailwind fill-bar colour based on occupancy */
  fillBarClass(percent: number): string {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    if (percent >= 40) return 'bg-blue-500';
    return 'bg-emerald-500';
  }
}

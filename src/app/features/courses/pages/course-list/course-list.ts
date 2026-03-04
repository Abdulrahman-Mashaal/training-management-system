import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, EMPTY, switchMap, catchError } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AccordionModule } from 'primeng/accordion';

import { FormField } from '@/shared/components/form-field/form-field';
import { AppTable } from '@/shared/components/app-table/app-table';
import { TableCellDirective } from '@/shared/components/app-table/directives/table-cell.directive';
import { CoursesService } from '@/features/courses/services/courses.service';
import { TeachersService } from '@/features/teachers/services/teachers.service';
import { CourseDialog } from '@/features/courses/components/course-dialog/course-dialog';
import { Course } from '@/features/courses/models/course.model';
import { Teacher } from '@/features/teachers/models/teacher.model';
import { TableColumn, PageRequest } from '@/core/models/table.model';
import { LanguageService } from '@/core/services/language.service';
import { SelectOption } from '@/core/models/form-field.model';

@Component({
  selector: 'app-course-list',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    AccordionModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    FormField,
    AppTable,
    TableCellDirective,
    CourseDialog,
  ],
  templateUrl: './course-list.html',
  styleUrl:    './course-list.scss',
})
export class CourseList {
  private readonly langSvc    = inject(LanguageService);
  private readonly svc        = inject(CoursesService);
  private readonly teacherSvc = inject(TeachersService);
  private readonly translate  = inject(TranslateService);
  private readonly fb         = inject(FormBuilder);
  private readonly router     = inject(Router);
  private readonly confirmSvc = inject(ConfirmationService);
  private readonly msgSvc     = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Teacher name map for column resolution ────────────────────────────────
  private readonly teacherMap = signal<Map<number, string>>(new Map());

  // ── Table columns ─────────────────────────────────────────────────────────
  readonly columns = computed<TableColumn[]>(() => {
    const isAr = this.langSvc.currentLang() === 'ar';
    return [
      { field: isAr ? 'titleAr' : 'titleEn', header: 'COURSES.TITLE_EN', sortable: true },
      { field: 'code',    header: 'COURSES.CODE',        sortable: true, width: '120px' },
      { field: 'level',   header: 'COURSES.LEVEL',       width: '140px' },
      { field: 'status',  header: 'COURSES.STATUS',      width: '140px' },
      { field: 'teacher', header: 'COURSES.TEACHER',     width: '180px' },
      { field: 'seats',   header: 'COURSES.SEATS_TOTAL', width: '100px' },
      { field: 'actions', header: 'TABLE.ACTIONS',       width: '150px' },
    ];
  });

  // ── Filter options ────────────────────────────────────────────────────────
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

  // ── Search form ───────────────────────────────────────────────────────────
  readonly searchForm: FormGroup = this.fb.group({
    title:  new FormControl<string | null>(null),
    level:  new FormControl<string | null>(null),
    status: new FormControl<string | null>(null),
  });

  // ── Table state ───────────────────────────────────────────────────────────
  readonly rows       = signal<Course[]>([]);
  readonly total      = signal<number>(0);
  readonly loading    = signal<boolean>(false);
  readonly tableFirst = signal<number>(0);

  // ── Dialog state ──────────────────────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly dialogCourse  = signal<Course | null>(null);
  readonly deletingId    = signal<number | null>(null);

  // ── Private state ─────────────────────────────────────────────────────────
  private readonly activeFilters = signal<Record<string, string>>({});
  private readonly currentSize   = signal<number>(5);
  private readonly currentSort   = signal<{ sortField?: string; sortOrder?: 'asc' | 'desc' }>({});

  private readonly loadTrigger$ = new Subject<PageRequest>();

  constructor() {
    // Pre-load teachers for name resolution in table rows
    this.teacherSvc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((teachers: Teacher[]) => {
        const map = new Map<number, string>();
        teachers.forEach(t => map.set(Number(t.id), `${t.firstNameEn} ${t.lastNameEn}`));
        this.teacherMap.set(map);
      });

    // Server-side paginated load pipeline
    this.loadTrigger$
      .pipe(
        switchMap(req => {
          this.loading.set(true);
          return this.svc.getPage(req, this.activeFilters()).pipe(
            catchError(() => { this.loading.set(false); return EMPTY; }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ data, total }) => {
        this.rows.set(data);
        this.total.set(total);
        this.loading.set(false);
      });
  }

  // ── Table events ──────────────────────────────────────────────────────────
  onPageChange(req: PageRequest): void {
    this.currentSize.set(req.size);
    this.currentSort.set({ sortField: req.sortField, sortOrder: req.sortOrder });
    this.loadTrigger$.next(req);
  }

  // ── Search ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    const { title, level, status } = this.searchForm.value as {
      title: string | null; level: string | null; status: string | null;
    };
    const isAr = this.langSvc.currentLang() === 'ar';
    const filters: Record<string, string> = {};
    if (title?.trim()) filters[isAr ? 'titleAr:contains' : 'titleEn:contains'] = title.trim();
    if (level)  filters['level']  = level;
    if (status) filters['status'] = status;
    this.activeFilters.set(filters);
    this.tableFirst.set(0);
    this.loadTrigger$.next({ page: 0, size: this.currentSize(), ...this.currentSort() });
  }

  resetForm(): void {
    this.searchForm.reset();
    this.activeFilters.set({});
    this.tableFirst.set(0);
    this.loadTrigger$.next({ page: 0, size: this.currentSize(), ...this.currentSort() });
  }

  // ── Row actions ───────────────────────────────────────────────────────────
  viewCourse(course: Course): void {
    this.router.navigate(['/courses', course.id]);
  }

  openDialog(course: Course | null = null): void {
    this.dialogCourse.set(course);
    this.dialogVisible.set(true);
  }

  onSaved(): void {
    this.loadTrigger$.next({
      page: Math.floor(this.tableFirst() / this.currentSize()),
      size: this.currentSize(),
      ...this.currentSort(),
    });
  }

  deleteCourse(course: Course): void {
    const isAr = this.langSvc.currentLang() === 'ar';
    const name = isAr ? course.titleAr : course.titleEn;

    this.confirmSvc.confirm({
      message:               this.translate.instant('COURSES.MSG.DELETE_CONFIRM', { name }),
      header:                this.translate.instant('COURSES.MSG.DELETE_TITLE'),
      icon:                  'pi pi-exclamation-triangle',
      acceptLabel:           this.translate.instant('COMMON.DELETE'),
      rejectLabel:           this.translate.instant('COMMON.CANCEL'),
      acceptButtonStyleClass:  'p-button-danger',
      rejectButtonStyleClass:  'p-button-secondary p-button-text',
      accept: () => {
        this.deletingId.set(course.id);
        this.svc.delete(course.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.deletingId.set(null);
              this.msgSvc.add({
                severity: 'success',
                summary:  this.translate.instant('COMMON.SUCCESS'),
                detail:   this.translate.instant('COURSES.MSG.DELETE_SUCCESS'),
                life: 3000,
              });
              const newFirst =
                this.rows().length === 1 && this.tableFirst() > 0
                  ? this.tableFirst() - this.currentSize()
                  : this.tableFirst();
              this.tableFirst.set(newFirst);
              this.loadTrigger$.next({
                page: Math.floor(newFirst / this.currentSize()),
                size: this.currentSize(),
                ...this.currentSort(),
              });
            },
            error: () => {
              this.deletingId.set(null);
              this.msgSvc.add({
                severity: 'error',
                summary:  this.translate.instant('COMMON.ERROR'),
                detail:   this.translate.instant('COURSES.MSG.DELETE_ERROR'),
                life: 5000,
              });
            },
          });
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getTeacherName(teacherId: number): string {
    return this.teacherMap().get(Number(teacherId)) ?? '—';
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'secondary' | 'warn' | 'danger' {
    const map: Record<string, 'success' | 'info' | 'secondary' | 'warn' | 'danger'> = {
      active: 'success', upcoming: 'info', completed: 'secondary', cancelled: 'danger',
    };
    return map[status] ?? 'secondary';
  }

  getLevelSeverity(level: string): 'success' | 'info' | 'warn' {
    const map: Record<string, 'success' | 'info' | 'warn'> = {
      Beginner: 'success', Intermediate: 'info', Advanced: 'warn',
    };
    return map[level] ?? 'info';
  }
}

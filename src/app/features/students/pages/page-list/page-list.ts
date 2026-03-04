import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, EMPTY, switchMap, catchError } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { FormField } from '@/shared/components/form-field/form-field';
import { AppTable } from '@/shared/components/app-table/app-table';
import { TableCellDirective } from '@/shared/components/app-table/directives/table-cell.directive';
import { StudentsService } from '@/features/students/services/students.service';
import { StudentDialog } from '@/features/students/components/student-dialog/student-dialog';
import { Student } from '@/features/students/models/student.model';
import { TableColumn, PageRequest } from '@/core/models/table.model';
import { LanguageService } from '@/core/services/language.service';
import { SelectOption } from '@/core/models/form-field.model';

@Component({
  selector: 'app-page-list',
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
    StudentDialog,
  ],
  templateUrl: './page-list.html',
  styleUrl: './page-list.scss',
})
export class PageList {
  private readonly langSvc = inject(LanguageService);
  private readonly svc = inject(StudentsService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly confirmSvc = inject(ConfirmationService);
  private readonly msgSvc = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Language-reactive column definitions ──────────────────────────────────
  /**
   * Computed signal: when the user switches language the table columns
   * instantly point to the correct bilingual field (firstNameEn / firstNameAr).
   */
  readonly columns = computed<TableColumn[]>(() => {
    const isAr = this.langSvc.currentLang() === 'ar';
    return [
      {
        field: isAr ? 'firstNameAr' : 'firstNameEn',
        header: 'STUDENTS.FIRST_NAME',
        sortable: true,
      },
      { field: isAr ? 'lastNameAr' : 'lastNameEn', header: 'STUDENTS.LAST_NAME', sortable: true },
      { field: 'email', header: 'STUDENTS.EMAIL' },
      { field: 'phone', header: 'STUDENTS.PHONE' },
      { field: 'status', header: 'STUDENTS.STATUS', width: '140px' },
      { field: 'actions', header: 'TABLE.ACTIONS', width: '150px' },
    ];
  });

  // ── Status filter options (re-translated when language changes) ───────────
  /**
   * Reading `langSvc.currentLang()` makes this signal reactive: every time the
   * language changes Angular re-runs the factory and `translate.instant()` is
   * called with the freshly-loaded translation set.
   */
  readonly statusOptions = computed<SelectOption<string>[]>(() => {
    this.langSvc.currentLang(); // declare reactive dependency
    return [
      { label: this.translate.instant('STUDENTS.STATUS_ACTIVE'), value: 'active' },
      { label: this.translate.instant('STUDENTS.STATUS_INACTIVE'), value: 'inactive' },
    ];
  });

  // ── Search form ───────────────────────────────────────────────────────────
  readonly searchForm: FormGroup = this.fb.group({
    firstName: new FormControl<string | null>(null),
    lastName: new FormControl<string | null>(null),
    status: new FormControl<string | null>(null),
  });

  // ── Table state signals ───────────────────────────────────────────────────
  readonly rows = signal<Student[]>([]);
  readonly total = signal<number>(0);
  readonly loading = signal<boolean>(false);

  /**
   * Tracks the current paginator offset so the parent can reset it to 0
   * after a search without remounting the table.
   */
  readonly tableFirst = signal<number>(0);

  // ── Dialog state ──────────────────────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly dialogStudent = signal<Student | null>(null);
  readonly deletingId = signal<number | null>(null);

  // ── Private state ─────────────────────────────────────────────────────────
  private readonly activeFilters = signal<Record<string, string>>({});
  private readonly currentSize = signal<number>(5); // mirrors [pageSize] default
  private readonly currentSort = signal<{
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }>({});

  /**
   * All data fetches flow through this Subject so that a new search always
   * cancels any in-flight HTTP request (switchMap).
   */
  private readonly loadTrigger$ = new Subject<PageRequest>();

  constructor() {
    this.loadTrigger$
      .pipe(
        switchMap((req) => {
          this.loading.set(true);
          return this.svc.getPage(req, this.activeFilters()).pipe(
            catchError(() => {
              this.loading.set(false);
              return EMPTY;
            }),
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

  // ── Table event: page / sort change ───────────────────────────────────────
  onPageChange(req: PageRequest): void {
    this.currentSize.set(req.size);
    this.currentSort.set({ sortField: req.sortField, sortOrder: req.sortOrder });
    this.loadTrigger$.next(req);
  }

  // ── Search form handlers ──────────────────────────────────────────────────
  onSubmit(): void {
    const { firstName, lastName, status } = this.searchForm.value as {
      firstName: string | null;
      lastName: string | null;
      status: string | null;
    };

    // Use language-aware field names with json-server's :contains operator
    // so searching "ali" in EN mode targets `firstNameEn:contains` not Arabic fields, and
    // vice-versa — giving precise, predictable results regardless of language.
    const isAr = this.langSvc.currentLang() === 'ar';
    const filters: Record<string, string> = {};
    if (firstName?.trim()) {
      filters[isAr ? 'firstNameAr:contains' : 'firstNameEn:contains'] = firstName.trim();
    }
    if (lastName?.trim()) {
      filters[isAr ? 'lastNameAr:contains' : 'lastNameEn:contains'] = lastName.trim();
    }
    if (status) filters['status'] = status;

    this.activeFilters.set(filters);
    this.tableFirst.set(0); // visually reset paginator to page 1
    this.loadTrigger$.next({
      page: 0,
      size: this.currentSize(),
      ...this.currentSort(),
    });
  }

  resetForm(): void {
    this.searchForm.reset();
    this.activeFilters.set({});
    this.tableFirst.set(0);
    this.loadTrigger$.next({
      page: 0,
      size: this.currentSize(),
      ...this.currentSort(),
    });
  }

  // ── Row actions ───────────────────────────────────────────────────────────

  /** Navigate to the student detail page. */
  viewStudent(student: Student): void {
    this.router.navigate(['/students', student.id]);
  }

  /** Open Add (null) or Edit (pre-filled) dialog. */
  openDialog(student: Student | null = null): void {
    // Set student BEFORE visible so effect() in StudentDialog patches the form
    // before the open animation begins — prevents a blank-then-filled flash.
    this.dialogStudent.set(student);
    this.dialogVisible.set(true);
  }

  /** Called when StudentDialog emits (saved) — stay on the current page. */
  onSaved(): void {
    this.loadTrigger$.next({
      page: Math.floor(this.tableFirst() / this.currentSize()),
      size: this.currentSize(),
      ...this.currentSort(),
    });
  }

  /** Delete with PrimeNG confirmation overlay. */
  deleteStudent(student: Student): void {
    const isAr = this.langSvc.currentLang() === 'ar';
    const name = isAr
      ? `${student.firstNameAr} ${student.lastNameAr}`
      : `${student.firstNameEn} ${student.lastNameEn}`;

    this.confirmSvc.confirm({
      message: this.translate.instant('STUDENTS.MSG.DELETE_CONFIRM', { name }),
      header: this.translate.instant('STUDENTS.MSG.DELETE_TITLE'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('COMMON.DELETE'),
      rejectLabel: this.translate.instant('COMMON.CANCEL'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => {
        this.deletingId.set(student.id);
        this.svc
          .delete(student.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.deletingId.set(null);
              this.msgSvc.add({
                severity: 'success',
                summary: this.translate.instant('COMMON.SUCCESS'),
                detail: this.translate.instant('STUDENTS.MSG.DELETE_SUCCESS'),
                life: 3000,
              });
              // Go back one page if this was the last row on a non-first page
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
}

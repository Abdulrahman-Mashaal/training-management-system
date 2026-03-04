import { Component, computed, contentChildren, input, output, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { TranslatePipe } from '@ngx-translate/core';

import { TableCellDirective } from './directives/table-cell.directive';
import { TableColumn, PageRequest } from '@/core/models/table.model';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [TableModule, SkeletonModule, NgTemplateOutlet, TranslatePipe],
  templateUrl: './app-table.html',
  styleUrl: './app-table.scss',
})
export class AppTable {
  // ── Required inputs ───────────────────────────────────────────────────────
  readonly columns = input.required<TableColumn[]>();

  // ── Data inputs (bound from the parent page) ──────────────────────────────
  readonly rows = input<unknown[]>([]);
  readonly totalRecords = input<number>(0);
  readonly loading = input<boolean>(false);

  // ── Pagination config ─────────────────────────────────────────────────────
  readonly pageSize = input<number>(10);
  readonly rowsPerPageOptions = input<number[]>([5, 10, 25]);

  /**
   * Controlled first-row offset.  Bind [first] + (firstChange) (or the
   * shorthand [(first)]) so the parent can programmatically reset the
   * paginator to page 1 after a search without remounting the table.
   */
  readonly first = input<number>(0);
  readonly firstChange = output<number>();

  // ── Empty-state customisation ─────────────────────────────────────────────
  readonly emptyMessage = input<string>('TABLE.EMPTY');
  readonly emptyIcon = input<string>('pi-inbox');

  // ── Events emitted on page / sort change ─────────────────────────────────
  readonly pageChange = output<PageRequest>();

  // ── Custom cell templates projected from the parent ───────────────────────
  private readonly cellDirectives = contentChildren<TableCellDirective>(TableCellDirective);

  /**
   * Builds a Map<field, TemplateRef> from all projected [appCell] directives.
   * Recalculated reactively if directives change. O(1) lookup per cell render.
   */
  readonly cellMap = computed(() => {
    const m = new Map<string, TemplateRef<unknown>>();
    for (const d of this.cellDirectives()) {
      m.set(d.field(), d.tpl);
    }
    return m;
  });

  /** Array used to render skeleton placeholder rows while loading */
  readonly skeletonRows = computed(() => Array(this.pageSize()).fill(null));

  // ── Lazy load handler ─────────────────────────────────────────────────────
  onLazyLoad(event: TableLazyLoadEvent): void {
    // Keep parent's tableFirst signal in sync so it can reset the paginator
    this.firstChange.emit(event.first ?? 0);

    this.pageChange.emit({
      // PrimeNG gives first=0,10,20… → convert to 0-based page index
      page: (event.first ?? 0) / (event.rows ?? this.pageSize()),
      size: event.rows ?? this.pageSize(),
      sortField: event.sortField as string | undefined,
      sortOrder: event.sortOrder === 1 ? 'asc' : event.sortOrder === -1 ? 'desc' : undefined,
    });
  }
}

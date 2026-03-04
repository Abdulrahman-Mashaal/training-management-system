// ── Column definition ─────────────────────────────────────────────────────────
export interface TableColumn {
  /** Key that maps to a property on the row data object */
  field: string;
  /** i18n translation key shown in the column header */
  header: string;
  /** Enable server-side sorting on this column (default: false) */
  sortable?: boolean;
  /** Fixed column width e.g. '120px' (optional) */
  width?: string;
}

// ── Pagination request (component → service) ──────────────────────────────────
export interface PageRequest {
  /** 0-based page index (PrimeNG style) */
  page: number;
  /** Number of rows per page */
  size: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Normalised response (service → component) ─────────────────────────────────
export interface PagedResponse<T> {
  data: T[];
  total: number;
}

// ── json-server v1 wire format ────────────────────────────────────────────────
// GET /resource?_page=1&_per_page=10  →  { data: [...], items: 50, pages: 5, … }
export interface JsonServerPagedResponse<T> {
  data: T[];
  items: number;        // total record count — used for paginator
  pages: number;
  first: number;
  last: number;
  prev: number | null;
  next: number | null;
}

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  JsonServerPagedResponse,
  PagedResponse,
  PageRequest,
} from '@/core/models/table.model';

/**
 * Abstract base service for all REST resources.
 *
 * Usage — extend and set the endpoint name:
 *   @Injectable({ providedIn: 'root' })
 *   export class StudentsService extends BaseApiService<Student> {
 *     protected override readonly endpoint = 'students';
 *   }
 *
 * getPage() maps PrimeNG's 0-based page index to json-server's 1-based _page
 * param, and normalises the response into { data, total }.
 */
@Injectable()
export abstract class BaseApiService<T> {
  protected abstract readonly endpoint: string;

  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.API_BASE_URL;

  // ── Server-side paginated fetch ───────────────────────────────────────────
  getPage(
    req: PageRequest,
    filters: Record<string, string> = {},
  ): Observable<PagedResponse<T>> {
    const params: Record<string, string> = {
      _page:     String(req.page + 1),   // json-server is 1-based
      _per_page: String(req.size),
      ...filters,                        // e.g. { q: 'john', status: 'active' }
    };

    if (req.sortField) {
      // json-server v1: prefix with '-' for descending
      params['_sort'] = req.sortOrder === 'desc'
        ? `-${req.sortField}`
        : req.sortField;
    }

    return this.http
      .get<JsonServerPagedResponse<T>>(`${this.baseUrl}/${this.endpoint}`, { params })
      .pipe(map(res => ({ data: res.data, total: res.items })));
  }

  // ── Full collection (no pagination) ──────────────────────────────────────
  getAll(): Observable<T[]> {
    return this.http.get<T[]>(`${this.baseUrl}/${this.endpoint}`);
  }

  // ── Single record ─────────────────────────────────────────────────────────
  getById(id: number | string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${this.endpoint}/${id}`);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  create(body: Partial<T>): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${this.endpoint}`, body);
  }

  // ── Update (partial) ──────────────────────────────────────────────────────
  update(id: number | string, body: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${this.endpoint}/${id}`, body);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${this.endpoint}/${id}`);
  }
}

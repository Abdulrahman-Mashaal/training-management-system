import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from '@/core/services/base-api.service';
import { Material } from '@/features/courses/models/material.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class MaterialsService extends BaseApiService<Material> {
  protected override readonly endpoint = 'materials';

  // Distinct names to avoid TS private-member collision with BaseApiService
  private readonly matHttp    = inject(HttpClient);
  private readonly matBaseUrl = environment.API_BASE_URL;

  /** Fetch all materials for a specific course, sorted by order ascending.
   *  json-server v1 sort syntax: `_sort=field` (asc) / `_sort=-field` (desc).
   *  The legacy `_order=asc` param is omitted — in v1 it is treated as a
   *  filter key and would return an empty result-set. */
  getByCourse(courseId: number | string): Observable<Material[]> {
    return this.matHttp.get<Material[]>(
      `${this.matBaseUrl}/materials?courseId=${courseId}&_sort=order`,
    );
  }
}

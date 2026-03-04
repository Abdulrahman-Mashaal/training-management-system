import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from '@/core/services/base-api.service';
import { Evaluation } from '@/features/teachers/models/evaluation.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class EvaluationsService extends BaseApiService<Evaluation> {
  protected override readonly endpoint = 'evaluations';

  // Use distinct names to avoid colliding with the private `http` and `baseUrl`
  // members declared in BaseApiService (TypeScript private ≠ protected — a
  // subclass cannot redeclare a parent's private member under the same name).
  private readonly evalHttp    = inject(HttpClient);
  private readonly evalBaseUrl = environment.API_BASE_URL;

  /** Fetch all evaluations for a specific teacher (json-server: ?teacherId=xxx) */
  getByTeacher(teacherId: string): Observable<Evaluation[]> {
    return this.evalHttp.get<Evaluation[]>(
      `${this.evalBaseUrl}/evaluations?teacherId=${teacherId}`,
    );
  }
}

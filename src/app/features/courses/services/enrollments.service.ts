import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from '@/core/services/base-api.service';
import { Enrollment } from '@/features/courses/models/enrollment.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class EnrollmentsService extends BaseApiService<Enrollment> {
  protected override readonly endpoint = 'enrollments';

  // Distinct names to avoid TS private-member collision with BaseApiService
  private readonly enrHttp    = inject(HttpClient);
  private readonly enrBaseUrl = environment.API_BASE_URL;

  /** Fetch all enrollments for a specific course */
  getByCourse(courseId: number | string): Observable<Enrollment[]> {
    return this.enrHttp.get<Enrollment[]>(
      `${this.enrBaseUrl}/enrollments?courseId=${courseId}`,
    );
  }

  /** Fetch all enrollments for a specific student */
  getByStudent(studentId: number | string): Observable<Enrollment[]> {
    return this.enrHttp.get<Enrollment[]>(
      `${this.enrBaseUrl}/enrollments?studentId=${studentId}`,
    );
  }
}

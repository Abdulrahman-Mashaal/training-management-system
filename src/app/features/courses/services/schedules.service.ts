import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from '@/core/services/base-api.service';
import { Schedule } from '@/features/courses/models/schedule.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class SchedulesService extends BaseApiService<Schedule> {
  protected override readonly endpoint = 'schedules';

  // Distinct names to avoid TS private-member collision with BaseApiService
  private readonly schedHttp    = inject(HttpClient);
  private readonly schedBaseUrl = environment.API_BASE_URL;

  /** Fetch all schedules for a specific course */
  getByCourse(courseId: number | string): Observable<Schedule[]> {
    return this.schedHttp.get<Schedule[]>(
      `${this.schedBaseUrl}/schedules?courseId=${courseId}`,
    );
  }
}

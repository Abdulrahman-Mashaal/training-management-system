import { Injectable } from '@angular/core';
import { BaseApiService } from '@/core/services/base-api.service';
import { Course } from '@/features/courses/models/course.model';

@Injectable({ providedIn: 'root' })
export class CoursesService extends BaseApiService<Course> {
  protected override readonly endpoint = 'courses';
}

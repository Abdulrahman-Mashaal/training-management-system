import { Injectable } from '@angular/core';
import { BaseApiService } from '@/core/services/base-api.service';
import { Student } from '@/features/students/models/student.model';

@Injectable({ providedIn: 'root' })
export class StudentsService extends BaseApiService<Student> {
  protected override readonly endpoint = 'students';
}

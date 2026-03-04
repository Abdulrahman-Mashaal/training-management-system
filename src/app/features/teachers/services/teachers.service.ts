import { Injectable } from '@angular/core';
import { BaseApiService } from '@/core/services/base-api.service';
import { Teacher } from '@/features/teachers/models/teacher.model';

@Injectable({ providedIn: 'root' })
export class TeachersService extends BaseApiService<Teacher> {
  protected override readonly endpoint = 'teachers';
}

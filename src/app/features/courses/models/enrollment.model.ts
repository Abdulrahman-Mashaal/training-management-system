export type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'in_progress';

export interface Enrollment {
  id:          number;
  courseId:    number;
  studentId:   number;
  enrolledAt?: string;   // ISO date — used by new records created via the UI
  enrolledOn?: string;   // ISO date — used by legacy records already in db.json
  status:      EnrollmentStatus;
}

export interface Student {
  id: number;
  firstNameEn: string;
  firstNameAr: string;
  lastNameEn: string;
  lastNameAr: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  enrolledCourseIds?: number[];  // optional — newly created students may not have it yet
  avatar?: string;
}

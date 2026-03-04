export interface Teacher {
  id:           string;              // stored as string "201" in db.json
  firstNameEn:  string;
  firstNameAr:  string;
  lastNameEn:   string;
  lastNameAr:   string;
  email:        string;
  phone:        string;
  departmentEn: string;
  departmentAr: string;
  bioEn:        string;
  bioAr:        string;
  rating:       number;              // 1–5 decimal (existing field)
  status:       'active' | 'inactive';
  specialties:  string[];
  avatar?:      string;
}

export interface Course {
  id:            number;
  titleEn:       string;
  titleAr:       string;
  code:          string;
  categoryId:    string;
  level:         string;
  durationHours: number;
  startDate:     string;
  endDate:       string;
  teacherId:     number;
  status:        string;
  seatsTotal:    number;
  seatsTaken:    number;
  price:         number;
  thumbnail?:    string;
  summaryEn?:    string;
  summaryAr?:    string;
}

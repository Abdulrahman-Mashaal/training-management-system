export interface Schedule {
  id:        number;
  courseId:  number;
  date:      string;   // ISO date string: "YYYY-MM-DD"
  startTime: string;   // "HH:MM" (24-hour)
  endTime:   string;   // "HH:MM" (24-hour)
  room:      string;
  notes?:    string;
}

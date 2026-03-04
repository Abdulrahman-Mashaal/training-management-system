export interface Evaluation {
  id:           number;
  teacherId:    string;   // matches teacher id type ("201", "202", etc.)
  reviewerName: string;
  rating:       number;   // 1–5 integer
  comment:      string;
  date:         string;   // "YYYY-MM-DD"
}

export type MaterialType = 'PDF' | 'Video' | 'Link' | 'Document';

export interface Material {
  id:             number;
  courseId:       number;
  titleEn:        string;
  titleAr:        string;
  type:           MaterialType;
  url:            string;
  descriptionEn?: string;
  descriptionAr?: string;
  order:          number;
}

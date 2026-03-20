export type DiagnosisType = {
  id: number;
  name: string;
  slug: string;
  oneWord: string;
  aruaru: string[];
  causeRedefinition: string;
  growthPoints: string[];
  priorityTheme: string;
  departments: string[];
  caseLinks: string[];
};

export type TargetTag = 'beginner' | 'low_grade' | 'late_start' | 'stagnation' | 'selection';

export type Lane = 'A' | 'B' | 'C';

export type SubLabel = {
  tag: TargetTag;
  label: string;
  message: string;
};

export type QuestionOption = {
  text: string;
  scores: Record<string, number>;
  tags?: TargetTag[];
};

export type Question = {
  id: number;
  text: string;
  description?: string;
  options: QuestionOption[];
};

export type DiagnosisResult = {
  id: string;
  type: DiagnosisType;
  lane: Lane;
  tags: TargetTag[];
  subLabels: SubLabel[];
  totalScore: number;
  answers: number[];
  createdAt: string;
};

export type UserRecord = {
  id: string;
  diagnosis_result_id: string;
  type_id: number;
  type_name: string;
  lane: Lane;
  tags: TargetTag[];
  total_score: number;
  answers: number[];
  name: string | null;
  email: string | null;
  prefecture: string | null;
  line_user_id: string | null;
  line_delivery_step: number;
  conversion_status: string;
  staff_required: boolean;
  selection_priority: boolean;
  created_at: string;
};

export interface TeacherSubmissionListItemResponse {
  id: string;
  assignmentId: string;
  studentId: string;
  contentText: string | null;
  fileUrl: string | null;
  answers: unknown;
  teacherNote: string | null;
  submittedAt: Date;
  status: 'submitted' | 'late' | 'graded';

  student: {
    id: string;
    name: string;
    email: string;
  };

  grade: {
    id: string;
    score: number;
    feedbackText: string | null;
    gradedAt: Date;
  } | null;
}

export type TeacherSubmissionListResponse = TeacherSubmissionListItemResponse[];

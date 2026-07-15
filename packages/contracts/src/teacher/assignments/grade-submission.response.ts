export interface GradeSubmissionResponse {
  id: string;
  submissionId: string | null;
  quizAttemptId: string | null;
  score: number;
  feedbackText: string | null;
  gradedById: string | null;
  gradedAt: Date;
}

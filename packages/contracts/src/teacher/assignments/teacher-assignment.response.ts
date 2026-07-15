export interface TeacherAssignmentResponse {
  id: string;
  courseId: string;
  createdById: string;
  type: 'assignment';
  title: string;
  instructions: string | null;
  maxScore: number;
  startsAt: Date | null;
  dueAt: Date | null;
  endsAt: Date | null;
  noteToStudents: string | null;
  status: 'draft' | 'published' | 'closed';
  createdAt: Date;
  updatedAt: Date;

  course: {
    id: string;
    title: string;
  };
}

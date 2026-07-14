export interface TeacherCourseResponse {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  joinCode: string | null;
  createdAt: Date;

  subject: {
    id: string;
    name: string;
    code: string | null;
  };

  section: {
    id: string;
    name: string;
    gradeLevel: {
      id: string;
      name: string;
    };
  } | null;

  _count: {
    enrollments: number;
    assignments: number;
  };
}

export type TeacherCourseListResponse = TeacherCourseResponse[];
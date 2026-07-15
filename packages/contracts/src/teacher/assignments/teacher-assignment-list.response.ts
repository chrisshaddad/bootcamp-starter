import type { TeacherAssignmentResponse } from './teacher-assignment.response';

export interface TeacherAssignmentListItemResponse extends TeacherAssignmentResponse {
  _count: {
    submissions: number;
  };
}

export type TeacherAssignmentListResponse = TeacherAssignmentListItemResponse[];

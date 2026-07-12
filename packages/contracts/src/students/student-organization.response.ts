export interface StudentOrganizationCard {
  id: string;
  name: string;
  description: string | null;
  studentCount: number;
}

export interface StudentOrganizationsResponse {
  organizations: StudentOrganizationCard[];
}
export interface StudentGradeCard {
  id: string;
  name: string;
  sectionCount: number;
  studentCount: number;
}

export interface StudentOrganizationGradesResponse {
  organizationId: string;
  grades: StudentGradeCard[];
}
export interface StudentListItem {
  id: string;
  studentCode: string;
  name: string;
  email: string;
  sectionName: string | null;
  dateOfBirth: string | null;
  status: string;
}

export interface StudentsByGradeResponse {
  organizationId: string;
  gradeId: string;
  students: StudentListItem[];
}

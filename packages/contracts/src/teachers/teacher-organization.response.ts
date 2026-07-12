export interface TeacherOrganizationCard {
  id: string;
  name: string;
  description: string | null;
  teacherCount: number;
}

export interface TeacherOrganizationsResponse {
  organizations: TeacherOrganizationCard[];
}
export interface TeacherListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface TeachersByOrganizationResponse {
  organizationId: string;
  teachers: TeacherListItem[];
}

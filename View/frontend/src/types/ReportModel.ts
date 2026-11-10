export type ReportStatus = 1 | 2 | 3;
export type ReportPriority = 1 | 2 | 3;

export interface Report {
  reportId: number;
  reportName: string;
  reportDescription: string;
  reportStatus: ReportStatus;
  reportPriority: ReportPriority;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  fk_user_creator: number | null;
  fk_user_assigned: number | null;
  xfk_item: number | null;
  fk_place: number | null;
  assignedUserName?: string;
  assignedUniversityId?: string | null;
  assignedEmployeeId?: number | null;
  creatorUserName?: string;
  creatorUniversityId?: string | null;
  creatorEmployeeId?: number | null;
}

export interface CreateReportPayload {
  name?: string;
  reportName?: string;
  description?: string;
  reportDescription?: string;
  status?: ReportStatus;
  reportStatus?: ReportStatus;
  priority?: ReportPriority;
  reportPriority?: ReportPriority;
  dueDate: string;
  fk_user?: number;
  fk_user_assigned?: number | null;
  fk_item?: number | null;
  fk_place?: number | null;
}

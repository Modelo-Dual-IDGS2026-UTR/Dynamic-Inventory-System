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
}

export interface CreateReportPayload {
  name: string;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  dueDate: string;
  fk_user: {
    id: number;
    firstName: string;
    lastName: string;
  };
  fk_item: {
    id: number;
    itemName: string;
  };
  fk_place: {
    id: number;
    name: string;
  };
}

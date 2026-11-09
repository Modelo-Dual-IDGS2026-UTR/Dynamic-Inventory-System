import type { CreateReportPayload, Report, ReportPriority, ReportStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiReport extends Partial<Report> {
  name?: string;
  description?: string;
  status?: number;
  priority?: number;
  fk_item?: number | { id?: number; itemId?: number; itemName?: string } | null;
  fk_place?: number | { id?: number; placeId?: number; name?: string; placeName?: string } | null;
  fk_user_assigned?: number | { id?: number; userId?: number; firstName?: string; lastName?: string } | null;
  fk_user_creator?: number | { id?: number; userId?: number; firstName?: string; lastName?: string } | null;
}

function normalizeReport(data: ApiReport): Report {
  const item = typeof data.fk_item === 'object' && data.fk_item !== null
    ? (data.fk_item.id ?? data.fk_item.itemId)
    : data.fk_item;
  const place = typeof data.fk_place === 'object' && data.fk_place !== null
    ? (data.fk_place.id ?? data.fk_place.placeId)
    : data.fk_place;
  const userAssigned = typeof data.fk_user_assigned === 'object' && data.fk_user_assigned !== null
    ? (data.fk_user_assigned.id ?? data.fk_user_assigned.userId)
    : data.fk_user_assigned;
  const userCreator = typeof data.fk_user_creator === 'object' && data.fk_user_creator !== null
    ? (data.fk_user_creator.id ?? data.fk_user_creator.userId)
    : (data.fk_user_creator ?? (data as ApiReport & { fk_user?: number }).fk_user);

  return {
    reportId: data.reportId ?? 0,
    reportName: data.reportName ?? data.name ?? 'Reporte sin nombre',
    reportDescription: data.reportDescription ?? data.description ?? '',
    reportStatus: (data.reportStatus ?? data.status ?? 1) as ReportStatus,
    reportPriority: (data.reportPriority ?? data.priority ?? 2) as ReportPriority,
    dueDate: data.dueDate ?? '',
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
    fk_user_creator: userCreator ?? null,
    fk_user_assigned: userAssigned ?? null,
    xfk_item: data.xfk_item ?? item ?? null,
    fk_place: place ?? null,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  });
  if (!response.ok) {
    let message = `No se pudo completar la operación (${response.status})`;
    try {
      const errorBody = await response.json() as { message?: unknown };
      if (typeof errorBody.message === 'string' && errorBody.message.trim()) {
        message = errorBody.message;
      }
    } catch {
      // Keep the status-based message when the server response is not JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function listFromResponse(data: unknown): ApiReport[] {
  if (Array.isArray(data)) return data as ApiReport[];
  if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
    return data.data as ApiReport[];
  }
  return [];
}

// POST /report/new-report
export async function createReport(payload: CreateReportPayload): Promise<Report> {
  const data = await request<ApiReport>('/report/new-report', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeReport(data);
}

// GET /report/read-report/:id
export async function getReportById(reportId: number): Promise<Report> {
  const data = await request<ApiReport>(`/report/read-report/${reportId}`);
  return normalizeReport(data);
}

// GET /report/all-reports
export async function getAllReports(): Promise<Report[]> {
  const data = await request<unknown>('/report/all-reports');
  return listFromResponse(data).map(normalizeReport);
}

// GET /report/user-reports/:userId
export async function getUserReports(userId: number): Promise<Report[]> {
  const data = await request<unknown>(`/report/user-reports/${userId}`);
  return listFromResponse(data).map(normalizeReport);
}

// GET /report/assigned-reports/:userId
export async function getAssignedReports(userId: number): Promise<Report[]> {
  const data = await request<unknown>(`/report/assigned-reports/${userId}`);
  return listFromResponse(data).map(normalizeReport);
}

// PATCH /report/set-status/:reportId
export async function updateReportStatus(reportId: number, status: ReportStatus): Promise<void> {
  await request(`/report/set-status/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// PATCH /report/set-assigned/:reportId
export async function updateReportAssignedUser(reportId: number, fk_user_assigned: number | null): Promise<void> {
  await request(`/report/set-assigned/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fk_user_assigned }),
  });
}

// PATCH /report/set-due/:reportId
export async function updateReportDueDate(reportId: number, dueDate: string): Promise<void> {
  await request(`/report/set-due/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ dueDate }),
  });
}

// PATCH /report/set-priority/:reportId
export async function updateReportPriority(reportId: number, reportPriority: ReportPriority): Promise<void> {
  await request(`/report/set-priority/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ reportPriority }),
  });
}

// DELETE /report/delete-report/:reportId
export async function deleteReport(reportId: number): Promise<void> {
  await request(`/report/delete-report/${reportId}`, {
    method: 'DELETE',
  });
}

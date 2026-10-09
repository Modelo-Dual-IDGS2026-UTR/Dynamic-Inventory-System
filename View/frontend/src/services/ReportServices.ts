import type { CreateReportPayload, Report, ReportPriority, ReportStatus } from '../types';

const API_URL = 'http://localhost:3000/api';

interface ApiReport extends Partial<Report> {
  name?: string;
  description?: string;
  status?: number;
  priority?: number;
  fk_item?: number | { id?: number };
}

function normalizeReport(data: ApiReport): Report {
  const item = typeof data.fk_item === 'object' ? data.fk_item?.id : data.fk_item;
  return {
    reportId: data.reportId ?? 0,
    reportName: data.reportName ?? data.name ?? 'Reporte sin nombre',
    reportDescription: data.reportDescription ?? data.description ?? '',
    reportStatus: (data.reportStatus ?? data.status ?? 1) as ReportStatus,
    reportPriority: (data.reportPriority ?? data.priority ?? 2) as ReportPriority,
    dueDate: data.dueDate ?? '',
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
    fk_user_creator: data.fk_user_creator ?? null,
    fk_user_assigned: data.fk_user_assigned ?? null,
    xfk_item: data.xfk_item ?? item ?? null,
    fk_place: data.fk_place ?? null,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`No se pudo completar la operación (${response.status})`);
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

export async function createReport(payload: CreateReportPayload): Promise<Report> {
  const data = await request<ApiReport>('/reports/new-report/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeReport(data);
}

export async function getUserReports(userId: number): Promise<Report[]> {
  const data = await request<unknown>(`/reports/user-reports/${userId}`);
  return listFromResponse(data).map(normalizeReport);
}

export async function getAllReports(): Promise<Report[]> {
  const data = await request<unknown>('/reports/all-reports/');
  return listFromResponse(data).map(normalizeReport);
}

export async function updateReportStatus(reportId: number, status: ReportStatus): Promise<void> {
  await request(`/reports/set-status/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function updateReportPriority(reportId: number, reportPriority: ReportPriority): Promise<void> {
  await request(`/reports/set-priority/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ reportPriority }),
  });
}

export async function updateReportDueDate(reportId: number, dueDate: string): Promise<void> {
  await request(`/reports/set-due/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ dueDate }),
  });
}

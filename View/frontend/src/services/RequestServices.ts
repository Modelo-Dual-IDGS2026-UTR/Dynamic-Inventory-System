import type { InventoryRequest, RequestStatus } from '../types';

const API_URL = 'http://localhost:3000/api';

interface ApiRequest extends Partial<InventoryRequest> {
  requestName?: string;
  description?: string;
  status?: number;
}

function normalizeRequest(data: ApiRequest): InventoryRequest {
  return {
    requestId: data.requestId ?? 0,
    name: data.name ?? data.requestName ?? 'Solicitud sin nombre',
    requestDescription: data.requestDescription ?? data.description ?? '',
    requestStatus: (data.requestStatus ?? data.status ?? 1) as RequestStatus,
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
    fk_item: data.fk_item ?? null,
    fk_user_receiver: data.fk_user_receiver ?? null,
    fk_user_requester: data.fk_user_requester ?? null,
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

function listFromResponse(data: unknown): ApiRequest[] {
  if (Array.isArray(data)) return data as ApiRequest[];
  if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
    return data.data as ApiRequest[];
  }
  return [];
}

export async function getUserRequests(userId: number): Promise<InventoryRequest[]> {
  const data = await request<unknown>(`/request/user-requests/${userId}`);
  return listFromResponse(data).map(normalizeRequest);
}

export async function getRequest(requestId: number): Promise<InventoryRequest> {
  const data = await request<ApiRequest>(`/request/one-request/${requestId}`);
  return normalizeRequest(data);
}

export interface CreateRequestPayload {
  name: string;
  description: string;
  status: RequestStatus;
  fk_item: number;
  fk_user: number;
  fk_category: number;
}

export async function createRequest(payload: CreateRequestPayload): Promise<InventoryRequest> {
  const data = await request<ApiRequest>('/post/create-request/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeRequest(data);
}

export async function acceptRequest(requestId: number): Promise<void> {
  await request('/request/accept-request/', {
    method: 'PATCH',
    body: JSON.stringify({ requestId }),
  });
}

export async function rejectRequest(requestId: number): Promise<void> {
  await request('/request/reject-request/', {
    method: 'PATCH',
    body: JSON.stringify({ requestId }),
  });
}

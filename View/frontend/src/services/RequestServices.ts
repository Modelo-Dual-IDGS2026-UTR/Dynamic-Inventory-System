import type { InventoryRequest, RequestStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiRequest extends Omit<Partial<InventoryRequest>, 'fk_item' | 'fk_user_requester' | 'fk_user_receiver'> {
  requestName?: string;
  description?: string;
  status?: number;
  fk_item?: number | { id?: number; itemName?: string } | null;
  fk_user_requester?: number | { id?: number; firstName?: string; lastName?: string } | null;
  fk_user_reciver?: number | { id?: number; firstName?: string; lastName?: string } | null;
  fk_user_receiver?: number | { id?: number; firstName?: string; lastName?: string } | null;
}

function normalizeRequest(data: ApiRequest): InventoryRequest {
  const item = data.fk_item;
  const requester = data.fk_user_requester;
  const receiver = data.fk_user_reciver ?? data.fk_user_receiver;
  const fullName = (user: typeof requester) => typeof user === 'object' && user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    : undefined;

  return {
    requestId: data.requestId ?? 0,
    name: data.name ?? data.requestName ?? 'Solicitud sin nombre',
    requestDescription: data.requestDescription ?? data.description ?? '',
    requestStatus: (data.requestStatus ?? data.status ?? 1) as RequestStatus,
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
    fk_item: typeof item === 'object' && item ? item.id ?? null : item ?? null,
    itemName: typeof item === 'object' && item ? item.itemName : data.itemName,
    fk_user_receiver: typeof receiver === 'object' && receiver ? receiver.id ?? null : receiver ?? null,
    receiverName: fullName(receiver),
    fk_user_requester: typeof requester === 'object' && requester ? requester.id ?? null : requester ?? null,
    requesterName: fullName(requester),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `No se pudo completar la operación (${response.status})`);
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

export async function getAllRequests(): Promise<InventoryRequest[]> {
  const data = await request<unknown>('/request/all-requests/');
  return listFromResponse(data).map(normalizeRequest);
}

export async function getReceivedRequests(userId: number): Promise<InventoryRequest[]> {
  const data = await request<unknown>(`/request/received-requests/${userId}`);
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
  const data = await request<ApiRequest>('/request/create-request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeRequest(data);
}

export async function acceptRequest(requestId: number): Promise<void> {
  await request(`/request/accept-request/${requestId}`, {
    method: 'PATCH',
  });
}

export async function rejectRequest(requestId: number): Promise<void> {
  await request(`/request/reject-request/${requestId}`, {
    method: 'PATCH',
  });
}

import type { AuthUser } from '../utils/auth';

const API_URL = 'http://localhost:3000/api';

export interface Permission {
  permissionId: number;
  permissionName: string;
  permissionDescription: string;
}

export interface AdminUser extends AuthUser {
  permissions: Permission[];
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
  return response.json() as Promise<T>;
}

export const getAdminUsers = () => request<AdminUser[]>('/user/admin-users');

export const updateUserRole = (userId: number, fk_role: number) => request<{ message: string }>(`/user/set-role/${userId}`, {
  method: 'PATCH',
  body: JSON.stringify({ fk_role }),
});

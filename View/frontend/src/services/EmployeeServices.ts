import type { Employee } from '../types/EmployeeModel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

export async function getAllEmployees(): Promise<Employee[]> {
  const data = await request<unknown>('/employee/all-employees');
  return Array.isArray(data) ? (data as Employee[]) : [];
}

export async function getEmployeeById(employeeId: number): Promise<Employee> {
  return request<Employee>(`/employee/find-employee/${employeeId}`);
}


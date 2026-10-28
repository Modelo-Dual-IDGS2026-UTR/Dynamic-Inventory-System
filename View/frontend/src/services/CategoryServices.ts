const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Category {
  categoryId: number;
  categoryName: string;
}

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_URL}/category/all-categories`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: unknown } | null;
    const message = typeof body?.message === 'string'
      ? body.message
      : `No se pudieron cargar las categorías (${response.status})`;
    throw new Error(message);
  }

  const categories = await response.json();
  return Array.isArray(categories) ? categories as Category[] : [];
}

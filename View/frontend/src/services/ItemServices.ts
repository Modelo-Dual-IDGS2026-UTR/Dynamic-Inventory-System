import type { Item } from "../types"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface CreateItemPayload {
    itemName: string;
    itemDescription: string;
    cost: number;
    manufacter: string;
    codeBar: string;
    fk_category: number;
    fk_user_responsible: number;
    fk_place: number;
}

export interface UpdateItemPayload {
    itemName: string;
    itemDescription: string;
    cost: number;
    manufacter: string;
    itemStatus: 'In Use' | 'In Stock' | 'Damaged';
    codeBar: string;
    category: number;
    fk_user_responsible: number;
    fk_place: number;
}

export async function getItems(parameter: Record<string, unknown> = {}): Promise<Item[]> {
    try {
        const query = new URLSearchParams(
            Object.entries(parameter)
                .filter(([, value]) => value !== undefined && value !== null && value !== '')
                .map(([key, value]) => [key, String(value)])
        );
        const response = await fetch(`${API_URL}/item/read-items${query.toString() ? `?${query}` : ''}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => null) as { message?: unknown } | null;
            const message = typeof errorBody?.message === 'string'
                ? errorBody.message
                : `No se pudieron cargar los artículos (${response.status})`;
            throw new Error(message);
        }
        const Items = await response.json();
        return Array.isArray(Items) ? Items : Items.data || [];
    } catch (error) {
        console.error('Error al cargar artículos:', error);
        return [];
    }
}

export async function getItemById(itemId: number): Promise<Item | null> {
    try {
        const response = await fetch(`${API_URL}/item/read-item/${itemId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

export async function createItem(payload: CreateItemPayload): Promise<void> {
    const response = await fetch(`${API_URL}/item/new-item`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
    });

    if (!response.ok) {
        let message = `No se pudo crear el artículo (${response.status})`;
        try {
            const errorBody = await response.json() as { message?: unknown };
            if (typeof errorBody.message === 'string' && errorBody.message.trim()) {
                message = errorBody.message;
            }
        } catch {
            // Keep default
        }
        throw new Error(message);
    }
}

export async function updateItem(itemId: number, payload: UpdateItemPayload): Promise<void> {
    const response = await fetch(`${API_URL}/item/update-item/${itemId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
    });

    if (!response.ok) {
        let message = `No se pudo actualizar el artículo (${response.status})`;
        try {
            const errorBody = await response.json() as { message?: unknown };
            if (typeof errorBody.message === 'string' && errorBody.message.trim()) {
                message = errorBody.message;
            }
        } catch {
            // Keep default
        }
        throw new Error(message);
    }
}

export async function setItemStatus(itemId: number, itemStatus: 'In Use' | 'In Stock' | 'Damaged'): Promise<void> {
    const response = await fetch(`${API_URL}/item/set-status/${itemId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemStatus }),
        credentials: 'include',
    });

    if (!response.ok) {
        let message = `No se pudo cambiar el estado (${response.status})`;
        try {
            const errorBody = await response.json() as { message?: unknown };
            if (typeof errorBody.message === 'string' && errorBody.message.trim()) {
                message = errorBody.message;
            }
        } catch {
            // Keep default
        }
        throw new Error(message);
    }
}

export async function setItemCategory(itemId: number, categoryId: number): Promise<void> {
    const response = await fetch(`${API_URL}/item/set-category/${itemId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: categoryId }),
        credentials: 'include',
    });

    if (!response.ok) {
        let message = `No se pudo cambiar la categoría (${response.status})`;
        try {
            const errorBody = await response.json() as { message?: unknown };
            if (typeof errorBody.message === 'string' && errorBody.message.trim()) {
                message = errorBody.message;
            }
        } catch {
            // Keep default
        }
        throw new Error(message);
    }
}

export async function changeResponsible(itemId: number, employeeId: number): Promise<void> {
    const response = await fetch(`${API_URL}/item/assign-responsible/${itemId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responsible_user: employeeId }),
        credentials: 'include',
    });

    if (!response.ok) {
        let message = `No se pudo reasignar el responsable (${response.status})`;
        try {
            const errorBody = await response.json() as { message?: unknown };
            if (typeof errorBody.message === 'string' && errorBody.message.trim()) {
                message = errorBody.message;
            }
        } catch {
            // Keep default
        }
        throw new Error(message);
    }
}

export async function deleteItem(itemId: number): Promise<void> {
    const response = await fetch(`${API_URL}/item/delete-item/${itemId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        let message = `No se pudo eliminar el artículo (${response.status})`;
        try {
            const errorBody = await response.json() as { message?: unknown };
            if (typeof errorBody.message === 'string' && errorBody.message.trim()) {
                message = errorBody.message;
            }
        } catch {
            // Keep default
        }
        throw new Error(message);
    }
}

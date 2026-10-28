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

export async function getItems(parameter:Record<string,unknown>={}):Promise<Item[]>{
    try {
        const query = new URLSearchParams(
            Object.entries(parameter)
                .filter(([, value]) => value !== undefined && value !== null && value !== '')
                .map(([key, value]) => [key, String(value)])
        );
        const response = await fetch(`${API_URL}/item/read-items${query.toString() ? `?${query}` : ''}`,{
            method:'GET',
            headers:{
                'Content-Type': 'application/json'
            },
            credentials:'include'
        })
        if(!response.ok){
            const errorBody = await response.json().catch(() => null) as { message?: unknown } | null;
            const message = typeof errorBody?.message === 'string'
                ? errorBody.message
                : `No se pudieron cargar los artículos (${response.status})`;
            throw new Error(message);
        }
        const Items=await response.json()
        return Array.isArray(Items) ? Items : Items.data || []
    } catch (error) {
        console.error('QUE PASOOOOOOOOOOOOOO?!?!?\n',error )
        return []
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
            // Keep the status-based message when the server response is not JSON.
        }
        throw new Error(message);
    }
}
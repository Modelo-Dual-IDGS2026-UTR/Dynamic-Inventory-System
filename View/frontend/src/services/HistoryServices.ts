export interface HistoryItem {
    historyId: number;
    action?: string;
    details?: string;
    fk_user?: {
        id: number;
        firstName: string;
        lastName: string;
        email?: string;
    } | null;
    fk_place?: {
        id: number;
        name: string;
    } | null;
    fk_report?: {
        id: number;
        name: string;
        status: number;
    } | null;
    fk_request?: {
        id: number;
        name: string;
        status: string;
    } | null;
    fk_item?: {
        id: number;
        name: string;
        description: string;
    } | null;
    createdAt?: string;
    updatedAt?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function getItemHistory(itemId: number): Promise<HistoryItem[]> {
    try {
        const response = await fetch(`${API_URL}/history/item-history/${itemId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        });
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}


import type { Item } from "../types"

const api=import.meta.env.API_URL

export interface CreateItemPayload {
    itemName: string;
    itemDescription: string;
    cost: number;
    manufacter: string;
    codeBar: string;
    category: 'No Category';
    fk_user_responsible: number;
    fk_place: number;
}

export async function getItems(parameter:Record<string,unknown>={}):Promise<Item[]>{
    try {
        const response = await fetch(`http://localhost:3000/api/item/read-items`,{
            method:'POST',
            headers:{
                'Content-Type': 'application/json'
            },
            body:JSON.stringify(parameter),
            credentials:'include'
        })
        if(!response.ok){
            throw new Error('AHHHHHHHHH') 
        }
        const Items=await response.json()
        return Array.isArray(Items) ? Items : Items.data || []
    } catch (error) {
        console.error('QUE PASOOOOOOOOOOOOOO?!?!?\n',error )
        return []
    }
}

export async function createItem(payload: CreateItemPayload): Promise<void> {
    const response = await fetch('http://localhost:3000/api/item/new-item', {
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
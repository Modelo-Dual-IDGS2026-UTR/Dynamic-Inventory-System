import type { Item } from "../types"

const api=import.meta.env.API_URL
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
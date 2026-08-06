import {JSX, useState,useEffect} from 'react'


interface User{
    "id":number,
    "userName":string
}

interface Place{
    "id":number,
    "name":string
}

interface item{
  "itemId":number,
  "itemName":string,
  "itemDescription":string,
  "manufacter":string,
  "cost":number,
  "category": string,
  "codeBar": string,
  "fk_user_responsible":User,
  "fk_place":Place    
}


const api=import.meta.env.API_URL
async function GetItems():Promise<item[]>{
    
    try {
        const response = await fetch(`http://localhost:3000/api/item/read-items`,{
            method:'POST',
            body:'{}',
            credentials:'include'
        })
        if(!response.ok){
            throw new Error('AHHHHHHHHH') 
        }
        const Items=await response.json()

        console.log(Items)
        return Array.isArray(Items) ? Items : Items.data || [];
    } catch (error) {
        throw new Error(`QUE PASOOOOOOOOOOOOOO?!?!?\nerror:${error}`) 
    }
}



function Table():JSX.Element {
    const [items,setItems]=useState<item[]>([])
    // useEffect ejecuta la petición solo una vez cuando el componente aparece en pantalla
    useEffect(() => {
    GetItems().then((data) => {
      setItems(data);
    });
  }, []); // Array de dependencias vacío = se ejecuta 1 sola vez al montar
    const table:JSX.Element=(
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Manufacturer</th>
                    <th>Cost</th>
                    <th>Category</th>
                    <th>Code Bar</th>
                    <th>Responsible</th>
                    <th>Place</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item)=>(
                    <tr key={item.itemId}>
                        <td>{item.itemId}</td>
                        <td>{item.itemName}</td>
                        <td>{item.itemDescription}</td>
                        <td>{item.manufacter}</td>
                        <td>{item.cost}</td>
                        <td>{item.category}</td>
                        <td>{item.codeBar}</td>
                        <td>{item.fk_user_responsible?.userName}</td>
                        <td>{item.fk_place?.name}</td>
                        
                    </tr>
                ))}
            </tbody>
        </table>
    )
    return table
}

export default <Table/>
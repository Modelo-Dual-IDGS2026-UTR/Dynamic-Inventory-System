import {JSX, useState,useEffect} from 'react'
import type { Item } from '../../types'
import { getItems } from '../../services/ItemServices'; 







function ItemTable():JSX.Element {
    const [items,setItems]=useState<Item[]>([])
    // useEffect ejecuta la petición solo una vez cuando el componente aparece en pantalla
    useEffect(() => {
    getItems().then((data) => {
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
                        <td>{item.fk_user_responsible?.firstName} {item.fk_user_responsible?.lastName}</td>
                        <td>{item.fk_place?.placeName}</td>
                        
                    </tr>
                    
                ))}
            </tbody>
        </table>
    )
    return table
}

export default <ItemTable/>
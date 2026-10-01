import { JSX } from 'react'
import type { Item } from '../../types'

interface ItemTableProps {
    items: Item[];
    onSelectItem: (item: Item) => void;
}







function ItemTable({ items, onSelectItem }: ItemTableProps): JSX.Element {
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

                    <tr
                        key={item.itemId}
                        onClick={() => onSelectItem(item)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onSelectItem(item);
                            }
                        }}
                        tabIndex={0}
                        role="button"
                    >
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

export default ItemTable
import { JSX } from 'react';
import styles from './Inventario.module.css';
import type { Item } from '../../types';

interface CardGridProps {
    items: Item[];
    onSelectItem: (item: Item) => void;
}

function CardGrid({ items, onSelectItem }: CardGridProps): JSX.Element {
    return (
        <div className={styles.gridContainer}>
            {items.map((item) => (
                <div
                    className={styles.gridCard}
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
                    <h3>{item.itemName}</h3>
                    <p>{item.itemDescription}</p>
                    <p>Fabricante: {item.manufacter}</p>
                    <p>Costo: ${item.cost.toFixed(2)}</p>
                </div>
            ))}
        </div>
    );
}

export default CardGrid;

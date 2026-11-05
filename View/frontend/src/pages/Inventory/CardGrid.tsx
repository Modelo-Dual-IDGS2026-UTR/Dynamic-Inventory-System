import { JSX } from 'react';
import styles from './Inventario.module.css';
import type { Item } from '../../types';

interface CardGridProps {
    items: Item[];
    onSelectItem: (item: Item) => void;
}

function CardGrid({ items, onSelectItem }: CardGridProps): JSX.Element {
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'In Use':
                return styles.statusInUse;
            case 'In Stock':
                return styles.statusInStock;
            case 'Damaged':
                return styles.statusDamaged;
            default:
                return '';
        }
    };

    return (
        <div className={styles.gridContainer}>
            {items.map((item) => {
                const categoryName = typeof item.category === 'string' ? item.category : item.category?.name;
                const responsibleName = item.fk_user_responsible
                    ? `${item.fk_user_responsible.employeeId ?? item.fk_user_responsible.id ?? ''} - ${item.fk_user_responsible.firstName} ${item.fk_user_responsible.lastName}`
                    : 'N/A';
                const formattedCost = typeof item.cost === 'number' ? `$${item.cost.toFixed(2)}` : 'N/A';

                return (
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
                        <div className={styles.gridCardHeader}>
                            <h3 title={item.itemName}>{item.itemName}</h3>
                            <span className={styles.gridCardId}>#{item.itemId}</span>
                        </div>

                        <p className={styles.gridCardDescription} title={item.itemDescription}>
                            {item.itemDescription || 'Sin descripción'}
                        </p>

                        <div className={styles.gridCardDetails}>
                            <div className={styles.gridCardRow}>
                                <span className={styles.gridCardLabel}>Fabricante:</span>
                                <span className={styles.gridCardValue} title={item.manufacter}>{item.manufacter || 'N/A'}</span>
                            </div>
                            <div className={styles.gridCardRow}>
                                <span className={styles.gridCardLabel}>Categoría:</span>
                                <span className={styles.gridCardValue} title={categoryName}>{categoryName || 'N/A'}</span>
                            </div>
                            <div className={styles.gridCardRow}>
                                <span className={styles.gridCardLabel}>Código de barras:</span>
                                <span className={styles.gridCardValue} title={item.codeBar ?? undefined}>{item.codeBar || 'N/A'}</span>
                            </div>
                            <div className={styles.gridCardRow}>
                                <span className={styles.gridCardLabel}>Ubicación:</span>
                                <span className={styles.gridCardValue} title={item.fk_place?.placeName}>{item.fk_place?.placeName || 'N/A'}</span>
                            </div>
                            <div className={styles.gridCardRow}>
                                <span className={styles.gridCardLabel}>Responsable:</span>
                                <span className={styles.gridCardValue} title={responsibleName}>{responsibleName}</span>
                            </div>
                            <div className={styles.gridCardRow}>
                                <span className={styles.gridCardLabel}>Costo:</span>
                                <span className={styles.gridCardValue}>{formattedCost}</span>
                            </div>
                        </div>

                        <div className={styles.gridCardFooter}>
                            <span className={styles.gridCardLabel}>Estado:</span>
                            <span className={`${styles.statusBadge} ${getStatusClass(item.itemStatus)}`}>
                                {item.itemStatus || 'N/A'}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default CardGrid;

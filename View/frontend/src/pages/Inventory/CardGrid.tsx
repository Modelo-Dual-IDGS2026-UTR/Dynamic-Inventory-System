import { JSX } from 'react';
import styles from './Inventario.module.css';
import type { Item } from '../../types';

interface CardGridProps {
    items: Item[];
    onSelectItem: (item: Item) => void;
    canViewCost?: boolean;
    canViewCodeBar?: boolean;
    isDeleteMode?: boolean;
    selectedItemIds?: number[];
    onToggleSelectItem?: (itemId: number) => void;
}

function CardGrid({
    items,
    onSelectItem,
    canViewCost = true,
    canViewCodeBar = true,
    isDeleteMode = false,
    selectedItemIds = [],
    onToggleSelectItem,
}: CardGridProps): JSX.Element {
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
                const isSelected = selectedItemIds.includes(item.itemId);

                return (
                    <div
                        className={`${styles.gridCard} ${isSelected ? styles.cardSelectedForDelete : ''}`}
                        key={item.itemId}
                        onClick={() => {
                            if (isDeleteMode) {
                                onToggleSelectItem?.(item.itemId);
                            } else {
                                onSelectItem(item);
                            }
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                if (isDeleteMode) {
                                    onToggleSelectItem?.(item.itemId);
                                } else {
                                    onSelectItem(item);
                                }
                            }
                        }}
                        tabIndex={0}
                        role="button"
                    >
                        <div className={styles.gridCardHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                {isDeleteMode && (
                                    <div
                                        className={styles.cardCheckboxWrapper}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            aria-label={`Seleccionar ${item.itemName} para borrar`}
                                            checked={isSelected}
                                            onChange={() => onToggleSelectItem?.(item.itemId)}
                                        />
                                    </div>
                                )}
                                <h3 title={item.itemName}>{item.itemName}</h3>
                            </div>
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
                            {canViewCodeBar && (
                                <div className={styles.gridCardRow}>
                                    <span className={styles.gridCardLabel}>Código de barras:</span>
                                    <span className={styles.gridCardValue} title={item.codeBar ?? undefined}>{item.codeBar || 'N/A'}</span>
                                </div>
                            )}
                            <div className={styles.gridCardRow}>
                                <span className={styles.gridCardLabel}>Ubicación:</span>
                                <span className={styles.gridCardValue} title={item.fk_place?.placeName}>{item.fk_place?.placeName || 'N/A'}</span>
                            </div>
                            <div className={styles.gridCardRow}>
                                <span className={styles.gridCardLabel}>Responsable:</span>
                                <span className={styles.gridCardValue} title={responsibleName}>{responsibleName}</span>
                            </div>
                            {canViewCost && (
                                <div className={styles.gridCardRow}>
                                    <span className={styles.gridCardLabel}>Costo:</span>
                                    <span className={styles.gridCardValue}>{formattedCost}</span>
                                </div>
                            )}
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

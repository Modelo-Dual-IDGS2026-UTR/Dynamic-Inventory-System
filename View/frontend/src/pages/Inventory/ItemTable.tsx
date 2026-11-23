import { JSX } from 'react';
import styles from './Inventario.module.css';
import type { Item } from '../../types';

interface ItemTableProps {
    items: Item[];
    onSelectItem: (item: Item) => void;
    canViewCost: boolean;
    canViewCodeBar: boolean;
    isDeleteMode: boolean;
    selectedItemIds: number[];
    onToggleSelectItem: (itemId: number) => void;
    onSelectAllItems: () => void;
    isAllSelected: boolean;
}

function ItemTable({
    items,
    onSelectItem,
    canViewCost,
    canViewCodeBar,
    isDeleteMode,
    selectedItemIds,
    onToggleSelectItem,
    onSelectAllItems,
    isAllSelected,
}: ItemTableProps): JSX.Element {
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
        <table>
            <thead>
                <tr>
                    {isDeleteMode && (
                        <th className={styles.deleteColHeader}>
                            <label className={styles.checkboxWrapper}>
                                <input
                                    type="checkbox"
                                    aria-label="Seleccionar todos para borrar"
                                    title="Seleccionar todos para borrar"
                                    checked={isAllSelected}
                                    onChange={onSelectAllItems}
                                />
                                <span className={styles.deleteColLabel}>Seleccionar</span>
                            </label>
                        </th>
                    )}
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Manufacturer</th>
                    {canViewCost && <th>Cost</th>}
                    <th>Category</th>
                    {canViewCodeBar && <th>Code Bar</th>}
                    <th>Responsible employee</th>
                    <th>Place</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item) => {
                    const categoryName = typeof item.category === 'string' ? item.category : item.category?.name;
                    const responsibleName = item.fk_user_responsible
                        ? `${item.fk_user_responsible.employeeId ?? item.fk_user_responsible.id ?? ''} - ${item.fk_user_responsible.firstName} ${item.fk_user_responsible.lastName}`
                        : 'N/A';
                    const formattedCost = typeof item.cost === 'number' ? `$${item.cost.toFixed(2)}` : 'N/A';
                    const isSelected = selectedItemIds.includes(item.itemId);

                    return (
                        <tr
                            key={item.itemId}
                            className={isSelected ? styles.rowSelectedForDelete : undefined}
                            onClick={() => {
                                if (isDeleteMode) {
                                    onToggleSelectItem(item.itemId);
                                } else {
                                    onSelectItem(item);
                                }
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    if (isDeleteMode) {
                                        onToggleSelectItem(item.itemId);
                                    } else {
                                        onSelectItem(item);
                                    }
                                }
                            }}
                            tabIndex={0}
                            role="button"
                        >
                            {isDeleteMode && (
                                <td
                                    className={styles.deleteColCell}
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <input
                                        type="checkbox"
                                        aria-label={`Seleccionar ${item.itemName} para borrar`}
                                        checked={isSelected}
                                        onChange={() => onToggleSelectItem(item.itemId)}
                                    />
                                </td>
                            )}
                            <td>
                                <span className={styles.gridCardId}>#{item.itemId}</span>
                            </td>
                            <td>
                                <strong className={styles.tableTruncateSm} title={item.itemName}>
                                    {item.itemName}
                                </strong>
                            </td>
                            <td>
                                <span className={styles.tableTruncate} title={item.itemDescription}>
                                    {item.itemDescription || 'Sin descripción'}
                                </span>
                            </td>
                            <td>
                                <span className={styles.tableTruncateSm} title={item.manufacter}>
                                    {item.manufacter || 'N/A'}
                                </span>
                            </td>
                            {canViewCost && <td>{formattedCost}</td>}
                            <td>
                                <span className={styles.tableTruncateSm} title={categoryName}>
                                    {categoryName || 'N/A'}
                                </span>
                            </td>
                            {canViewCodeBar && (
                                <td>
                                    <span className={styles.tableTruncateSm} title={item.codeBar ?? undefined}>
                                        {item.codeBar || 'N/A'}
                                    </span>
                                </td>
                            )}
                            <td>
                                <span className={styles.tableTruncate} title={responsibleName}>
                                    {responsibleName}
                                </span>
                            </td>
                            <td>
                                <span className={styles.tableTruncateSm} title={item.fk_place?.placeName}>
                                    {item.fk_place?.placeName || 'N/A'}
                                </span>
                            </td>
                            <td>
                                <span className={`${styles.statusBadge} ${getStatusClass(item.itemStatus)}`}>
                                    {item.itemStatus || 'N/A'}
                                </span>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export default ItemTable;

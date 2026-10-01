import React, { useEffect, useState } from 'react';
import { useView } from '../../context/ViewContext';
import styles from './Inventario.module.css';
import ItemTable from './ItemTable';
import CardGrid from './CardGrid';
import type { Item } from '../../types';
import { getItems } from '../../services/ItemServices';

export const Inventory: React.FC = () => {
  const { viewType } = useView();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    getItems().then(setItems);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedItem(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}><span className={styles.statLabel}>Total de Mobiliario</span><span className={styles.statValue}>{items.length}</span></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Elementos cargados</span><span className={styles.statValue}>{items.length}</span></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Vista actual</span><span className={styles.statValue}>{viewType}</span></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Elementos</span><span className={styles.statValue}>{items.length}</span></div>
      </div>

      <div className={styles.dataContainer}>
        {viewType === 'tabla' ? (
          <div className={styles.tablePlaceholderCard}>
            <ItemTable items={items} onSelectItem={setSelectedItem} />
          </div>
        ) : (
          <CardGrid items={items} onSelectItem={setSelectedItem} />
        )}
      </div>

      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeBtn} type="button" onClick={() => setSelectedItem(null)} aria-label="Cerrar detalle">✕</button>
            <div className={styles.modalBody}>
              <div className={styles.modalLeftColumn}>
                <h2>{selectedItem.itemName}</h2>
                <div className={styles.infoPill}>ID: {selectedItem.itemId}</div>
                <div className={styles.infoPill}>Descripción: {selectedItem.itemDescription}</div>
                <div className={styles.infoPill}>Fabricante: {selectedItem.manufacter}</div>
                <div className={styles.infoPill}>Costo: ${selectedItem.cost.toFixed(2)}</div>
                <div className={styles.infoPill}>Categoría: {selectedItem.category}</div>
                <div className={styles.infoPill}>Código: {selectedItem.codeBar || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

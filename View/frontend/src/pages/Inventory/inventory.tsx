import React, { useState } from 'react';
import { useView } from '../../context/ViewContext';
import styles from './Inventario.module.css';

export const Inventory: React.FC = () => {
  const { viewType } = useView();
  const [selectedItem, setSelectedItem] = useState<boolean>(false);

  return (
    <div className={styles.container}>
      {/* 4 Tarjetas de Estadísticas según PDF */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconRed}`}>🪑</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total de Mobiliario</span>
            <span className={styles.statValue}>1,250</span>
            <span className={styles.statSubtext}>Todos los ítems registrados</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>✔</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>En Uso</span>
            <span className={styles.statValue}>980</span>
            <span className={styles.statSubtext}>78.4% del total</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconYellow}`}>📦</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>En Bodega</span>
            <span className={styles.statValue}>210</span>
            <span className={styles.statSubtext}>16.8% del total</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconWarning}`}>⚠️</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Dañado</span>
            <span className={styles.statValue}>60</span>
            <span className={styles.statSubtext}>4.8% del total</span>
          </div>
        </div>
      </div>

      {/* Contenedor Principal (Tabla o Grid de Tarjetas) */}
      <div className={styles.dataContainer}>
        {viewType === 'tabla' ? (
          <div className={styles.tablePlaceholderCard} onClick={() => setSelectedItem(true)}>
            <h1 className={styles.placeholderTitle}>TABLA PLACE HOLDER</h1>
          </div>
        ) : (
          <div className={styles.gridContainer}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div 
                key={index} 
                className={styles.gridCardPlaceholder}
                onClick={() => setSelectedItem(true)}
              >
                information container place holder
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalle/Acciones (Página 2 del PDF) */}
      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeBtn} 
              onClick={() => setSelectedItem(false)}
              aria-label="Cerrar modal"
            >
              ✕
            </button>

            <div className={styles.modalBody}>
              {/* Columna Izquierda: Bloques de Información */}
              <div className={styles.modalLeftColumn}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className={styles.infoPill}>
                    information container place holder
                  </div>
                ))}
              </div>

              {/* Columna Derecha: Acciones e Historial */}
              <div className={styles.modalRightColumn}>
                <button className={styles.reportBtn}>
                  📈 Reportar
                </button>
                <button className={styles.requestBtn}>
                  📝 Solicitar
                </button>

                <div className={styles.historyCard}>
                  <h3>Historial</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
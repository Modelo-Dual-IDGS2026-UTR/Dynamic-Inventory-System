import React from 'react';
import { useLocation } from 'react-router-dom';
import { useView } from '../../../context/ViewContext';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const location = useLocation();
  const { viewType, setViewType, searchQuery, setSearchQuery } = useView();

  const isInventario = location.pathname === '/dashboard';

  return (
    <header className={styles.header}>
      {/* Barra de Búsqueda Estilo PDF */}
      <div className={styles.searchPill}>
        <button className={styles.menuIconButton} aria-label="Filtros de Búsqueda">
          ☰
        </button>
        <input 
          type="text" 
          placeholder="Buscar mobiliario, código o ubicación..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className={styles.searchSubmitButton} aria-label="Buscar">
          🔍
        </button>
      </div>

      {/* Controles del Lado Derecho: Selector de Vista (para Inventario) y Badge Usuario */}
      <div className={styles.rightSection}>
        {isInventario && (
          <div className={styles.viewToggleGroup}>
            <button 
              className={`${styles.viewBtn} ${viewType === 'tabla' ? styles.activeView : ''}`}
              onClick={() => setViewType('tabla')}
            >
              <span className={styles.viewIcon}>≡</span>
              <span>table</span>
            </button>
            <button 
              className={`${styles.viewBtn} ${viewType === 'tarjetas' ? styles.activeView : ''}`}
              onClick={() => setViewType('tarjetas')}
            >
              <span className={styles.viewIcon}>⊞</span>
              <span>grid</span>
            </button>
          </div>
        )}

        <div className={styles.userBadge}>
          <span className={styles.userIcon}>👤</span>
          <span>Invitado</span>
        </div>
      </div>
    </header>
  );
};

export default Header;

import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useView } from '../../../context/ViewContext';
import { useAuth } from '../../../utils/auth';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    viewType,
    setViewType,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    placeFilter,
    setPlaceFilter,
    categoryOptions,
    placeOptions,
  } = useView();
  const { isAuthenticated, currentUser } = useAuth();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const isInventario = location.pathname.toLowerCase() === '/dashboard';
  const filterCount = useMemo(
    () => Number(Boolean(categoryFilter)) + Number(Boolean(placeFilter)),
    [categoryFilter, placeFilter],
  );

  return (
    <header className={styles.header}>
      {/* Barra de Búsqueda Estilo PDF */}
      <div className={styles.searchPill}>
        <button
          className={`${styles.menuIconButton} ${isFilterOpen ? styles.filterActive : ''}`}
          type="button"
          aria-label="Filtros de búsqueda"
          aria-expanded={isFilterOpen}
          onClick={() => setIsFilterOpen((isOpen) => !isOpen)}
        >
          ☰
          {filterCount > 0 && <span className={styles.filterCount}>{filterCount}</span>}
        </button>
        <input 
          type="text" 
          placeholder="Buscar mobiliario, código o ubicación..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          className={styles.searchSubmitButton}
          type="button"
          aria-label="Buscar"
          onClick={() => setSearchQuery(searchQuery.trim())}
        >
          🔍
        </button>
        {isInventario && isFilterOpen && (
          <div className={styles.filterPanel}>
            <label htmlFor="categoryFilter">Categoría</label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <label htmlFor="placeFilter">Ubicación</label>
            <select
              id="placeFilter"
              value={placeFilter}
              onChange={(event) => setPlaceFilter(event.target.value)}
            >
              <option value="">Todas las ubicaciones</option>
              {placeOptions.map((place) => (
                <option key={place} value={place}>{place}</option>
              ))}
            </select>
            <button
              className={styles.clearFilters}
              type="button"
              onClick={() => {
                setCategoryFilter('');
                setPlaceFilter('');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
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

        <button
          className={styles.userBadge}
          type="button"
          title={currentUser?.email || 'Estado de la cuenta'}
          onClick={() => {
            if (!currentUser) navigate('/login');
          }}
        >
          <span className={styles.userIcon}>👤</span>
          <span>
            {isAuthenticated === null
              ? 'Cargando...'
              : currentUser
                ? `${currentUser.firstName} ${currentUser.lastName}`
                : 'Invitado'}
          </span>
        </button>
      </div>
    </header>
  );
};

export default Header;

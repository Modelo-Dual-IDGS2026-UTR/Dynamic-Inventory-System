import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';

const utrLogo = new URL('../../../assets/images/UTR LOGO W BORDER.png', import.meta.url).href;

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: 'Inventario', path: '/inventario', icon: '📋' },
    { name: 'Reportes', path: '/reportes', icon: '📊' },
    { name: 'Solicitudes', path: '/solicitudes', icon: '📥' },
  ];

  return (
    <>
      {/* Botón de Hamburguesa */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={styles.hamburgerBtn}
        aria-label="Toggle Sidebar"

      >
        ☰
      </button>

      {/* Contenedor Principal de la Sidebar */}
      <aside className={`${styles.sidebarContainer} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.spacer} />

        {/* Contenedor del Logo */}
        <div className={styles.logoContainer}>
          <div className={styles.logoWrapper}>
            <img src={utrLogo} alt="UTR Logo" className={styles.logoImg} />
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav className={styles.navMenu}>
          <ul className={styles.menuList}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.name}>
                  <button
                    className={`${styles.menuBtn} ${isActive ? styles.active : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <span className={styles.menuIcon}>{item.icon}</span>
                    <span className={styles.menuText}>{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer con el Avatar */}
        <div className={styles.footer}>
          <div
            className={styles.avatar}
            onClick={() => navigate('/select-area')}
            title="Perfil / Cambiar Área"
          >
            👤
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
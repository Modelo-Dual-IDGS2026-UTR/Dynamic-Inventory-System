import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { useAuth } from '../../../utils/auth';

const utrLogo = new URL('../../../assets/images/UTR LOGO W BORDER.png', import.meta.url).href;

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Inventario', path: '/Dashboard', icon: '📋' },
    { name: 'Reportes', path: '/Dashboard/reportes', icon: '📊' },
    { name: 'Solicitudes (usuario)', path: '/Dashboard/solicitudes/usuario', icon: '📨', role: 3 },
    { name: 'Solicitudes (admin)', path: '/Dashboard/solicitudes/admin', icon: '📨', role: 2 },
    { name: 'Solicitudes (superadmin)', path: '/Dashboard/solicitudes/superadmin', icon: '📨', role: 1 },
    { name: 'Usuarios', path: '/Dashboard/usuarios', icon: '👥', role: 1 },
  ];
  const visibleMenuItems = menuItems.filter((item) => !('role' in item) || item.role === currentUser?.fk_role);

  return (
    <>
      {/* Botón de Hamburguesa */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`${styles.hamburgerBtn} ${isCollapsed ? styles.collapsedHamburger : ''}`}
        aria-label="Toggle Sidebar"
      >
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
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
            {visibleMenuItems.map((item) => {
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
          <button
            type="button"
            className={styles.avatar}
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            title="Abrir menú de cuenta"
            aria-expanded={isAccountMenuOpen}
          >
            👤
          </button>
          {isAccountMenuOpen && (
            <div className={styles.accountMenu}>
              <strong>{currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Cuenta'}</strong>
              <span>{currentUser?.email}</span>
              {currentUser?.fk_role === 1 && (
                <button type="button" onClick={() => navigate('/Dashboard/usuarios')}>Administrar usuarios</button>
              )}
              <button type="button" onClick={() => void logout().then(() => navigate('/login'))}>Cerrar sesión</button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
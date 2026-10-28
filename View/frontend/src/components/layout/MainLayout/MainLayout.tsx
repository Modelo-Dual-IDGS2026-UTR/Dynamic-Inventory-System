import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../SideBar/Sidebar';
import { Header } from '../Header/Header';
import { ViewProvider } from '../../../context/ViewContext';
import styles from './MainLayout.module.css';

export const MainLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <ViewProvider>
      <div className={styles.layoutWrapper}>
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        
        <div className={`${styles.mainArea} ${isCollapsed ? styles.expanded : ''}`}>
          <Header />
          <main className={styles.pageContent}>
            <Outlet />
          </main>
        </div>
      </div>
    </ViewProvider>
  );
};

export default MainLayout;
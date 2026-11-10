import React from 'react';
import type { Report } from '../../types';
import styles from '../../pages/Reports/Reports.module.css';

interface ReportMetricsProps {
  reports: Report[];
}

export const ReportMetrics: React.FC<ReportMetricsProps> = ({ reports }) => (
  <div className={styles.statsGrid}>
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${styles.totalIcon}`}>
        <span aria-hidden="true">▤</span>
      </div>
      <div className={styles.statInfo}>
        <strong className={styles.statValue}>{reports.length}</strong>
        <span className={styles.statLabel}>Total de reportes</span>
      </div>
    </div>
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${styles.criticalIcon}`}>
        <span aria-hidden="true">!</span>
      </div>
      <div className={styles.statInfo}>
        <strong className={styles.statValue}>{reports.filter((report) => report.reportStatus === 1).length}</strong>
        <span className={styles.statLabel}>Pendientes</span>
      </div>
    </div>
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${styles.supportIcon}`}>
        <span aria-hidden="true">⚙</span>
      </div>
      <div className={styles.statInfo}>
        <strong className={styles.statValue}>{reports.filter((report) => report.reportStatus === 2).length}</strong>
        <span className={styles.statLabel}>En proceso</span>
      </div>
    </div>
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${styles.solvedIcon}`}>
        <span aria-hidden="true">✓</span>
      </div>
      <div className={styles.statInfo}>
        <strong className={styles.statValue}>{reports.filter((report) => report.reportStatus === 3).length}</strong>
        <span className={styles.statLabel}>Resueltos</span>
      </div>
    </div>
  </div>
);

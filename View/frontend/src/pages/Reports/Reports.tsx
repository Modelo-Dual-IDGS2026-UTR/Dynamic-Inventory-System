import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../utils/auth';
import type { Item, Report, ReportPriority, ReportStatus } from '../../types';
import { getAllReports, getUserReports, updateReportDueDate, updateReportPriority, updateReportStatus } from '../../services/ReportServices';
import { createReport } from '../../services/ReportServices';
import { getItems } from '../../services/ItemServices';
import styles from './Reports.module.css';

const statusLabels: Record<ReportStatus, string> = { 1: 'Pendiente', 2: 'En proceso', 3: 'Resuelto' };
const priorityLabels: Record<ReportPriority, string> = { 1: 'Alta', 2: 'Media', 3: 'Baja' };

function formatDate(value: string): string {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-MX');
}

export const Reports: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.fk_role === 1 || currentUser?.fk_role === 2;
  const [reports, setReports] = useState<Report[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportPriority, setReportPriority] = useState<ReportPriority>(2);
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const loadReports = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError('');
    try {
      setReports(isAdmin ? await getAllReports() : await getUserReports(currentUser.userId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los reportes.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (isNewReportOpen && items.length === 0) {
      getItems().then(setItems).catch(() => setFormMessage('No se pudieron cargar los artículos.'));
    }
  }, [isNewReportOpen, items.length]);

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) => [
      item.itemName,
      item.itemDescription,
      item.codeBar,
      item.manufacter,
      item.fk_place?.placeName,
    ].join(' ').toLocaleLowerCase().includes(query));
  }, [items, itemSearch]);

  const closeNewReport = () => {
    if (isSubmitting) return;
    setIsNewReportOpen(false);
    setItemSearch('');
    setSelectedItem(null);
    setReportReason('');
    setReportPriority(2);
    setReportDetails('');
    setFormMessage('');
  };

  const submitNewReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser || !selectedItem || !reportReason || !reportDetails.trim()) {
      setFormMessage('Selecciona un artículo, un motivo y describe el problema.');
      return;
    }

    setIsSubmitting(true);
    setFormMessage('');
    try {
      await createReport({
        name: reportReason,
        description: reportDetails.trim(),
        status: 1,
        priority: reportPriority,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        fk_user: {
          id: currentUser.userId,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
        },
        fk_item: {
          id: selectedItem.itemId,
          itemName: selectedItem.itemName,
        },
        fk_place: {
          id: selectedItem.fk_place.placeId,
          name: selectedItem.fk_place.placeName,
        },
      });
      await loadReports();
      setIsSubmitting(false);
      closeNewReport();
    } catch (submitError) {
      setFormMessage(submitError instanceof Error ? submitError.message : 'No se pudo enviar el reporte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (reportId: number, status: ReportStatus) => {
    try {
      await updateReportStatus(reportId, status);
      await loadReports();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el estado.');
    }
  };

  const updatePriority = async (reportId: number, priority: ReportPriority) => {
    try {
      await updateReportPriority(reportId, priority);
      await loadReports();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la prioridad.');
    }
  };

  const updateDueDate = async (reportId: number, dueDate: string) => {
    try {
      await updateReportDueDate(reportId, dueDate);
      await loadReports();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la fecha.');
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Reportes</h1>
          <p className={styles.subtitle}>{isAdmin ? 'Gestiona los reportes del inventario.' : 'Consulta el estado de tus reportes.'}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.newReportButton} type="button" onClick={() => setIsNewReportOpen(true)}>
            + Reporte nuevo
          </button>
          <button className={styles.actionButton} type="button" onClick={() => void loadReports()}>
            Actualizar
          </button>
        </div>
      </header>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.tableCard}>
        {isLoading ? <div className={styles.message}>Cargando reportes...</div> : reports.length === 0 ? <div className={styles.empty}>No hay reportes para mostrar.</div> : (
          <table className={styles.table}>
            <thead><tr><th>Reporte</th><th>Descripción</th><th>Estado</th><th>Prioridad</th><th>Fecha límite</th>{isAdmin && <th>Acciones</th>}</tr></thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.reportId}>
                  <td>{report.reportName}</td>
                  <td>{report.reportDescription}</td>
                  <td>
                    {isAdmin ? (
                      <select className={styles.select} value={report.reportStatus} onChange={(event) => void updateStatus(report.reportId, Number(event.target.value) as ReportStatus)}>
                        <option value={1}>Pendiente</option><option value={2}>En proceso</option><option value={3}>Resuelto</option>
                      </select>
                    ) : <span className={`${styles.badge} ${styles[`status${report.reportStatus}`]}`}>{statusLabels[report.reportStatus]}</span>}
                  </td>
                  <td>
                    {isAdmin ? (
                      <select className={styles.select} value={report.reportPriority} onChange={(event) => void updatePriority(report.reportId, Number(event.target.value) as ReportPriority)}>
                        <option value={1}>Alta</option><option value={2}>Media</option><option value={3}>Baja</option>
                      </select>
                    ) : <span className={styles[`priority${report.reportPriority}`]}>{priorityLabels[report.reportPriority]}</span>}
                  </td>
                  <td>{isAdmin ? <input className={styles.dateInput} type="date" value={report.dueDate ? report.dueDate.slice(0, 10) : ''} onChange={(event) => void updateDueDate(report.reportId, event.target.value)} /> : formatDate(report.dueDate)}</td>
                  {isAdmin && <td>{formatDate(report.createdAt)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isNewReportOpen && (
        <div className={styles.modalOverlay} onClick={closeNewReport}>
          <div className={styles.reportModal} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeButton} type="button" onClick={closeNewReport} aria-label="Cerrar formulario">
              ✕
            </button>
            <h2>Crear reporte nuevo</h2>
            <p className={styles.modalSubtitle}>Selecciona el mobiliario y describe el problema.</p>

            <label className={styles.formLabel} htmlFor="reportItemSearch">Buscar artículo</label>
            <input
              id="reportItemSearch"
              className={styles.formInput}
              type="search"
              placeholder="Nombre, código o ubicación..."
              value={itemSearch}
              onChange={(event) => setItemSearch(event.target.value)}
            />

            <div className={styles.itemResults}>
              {filteredItems.length === 0 ? (
                <p className={styles.noResults}>No se encontraron artículos.</p>
              ) : filteredItems.slice(0, 8).map((item) => (
                <button
                  className={`${styles.itemOption} ${selectedItem?.itemId === item.itemId ? styles.selectedItem : ''}`}
                  type="button"
                  key={item.itemId}
                  onClick={() => setSelectedItem(item)}
                >
                  <strong>{item.itemName}</strong>
                  <span>{item.codeBar || 'Sin código'} · {item.fk_place?.placeName || 'Sin ubicación'}</span>
                </button>
              ))}
            </div>

            <form className={styles.newReportForm} onSubmit={submitNewReport}>
              <p className={styles.selectedItemText}>
                {selectedItem ? `Artículo seleccionado: ${selectedItem.itemName}` : 'Ningún artículo seleccionado'}
              </p>
              <label className={styles.formLabel} htmlFor="newReportReason">Motivo del reporte</label>
              <select id="newReportReason" className={styles.formInput} value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                <option value="" disabled>Selecciona un motivo</option>
                <option value="Mobiliario dañado">Mobiliario dañado</option>
                <option value="Mobiliario faltante">Mobiliario faltante</option>
                <option value="Información incorrecta">Información incorrecta</option>
              </select>
              <label className={styles.formLabel} htmlFor="newReportPriority">Prioridad</label>
              <select id="newReportPriority" className={styles.formInput} value={reportPriority} onChange={(event) => setReportPriority(Number(event.target.value) as ReportPriority)}>
                <option value={1}>Alta</option>
                <option value={2}>Media</option>
                <option value={3}>Baja</option>
              </select>
              <label className={styles.formLabel} htmlFor="newReportDetails">Detalles</label>
              <textarea id="newReportDetails" className={styles.formInput} rows={4} placeholder="Describe el problema" value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} />
              {formMessage && <p className={styles.formMessage}>{formMessage}</p>}
              <div className={styles.modalActions}>
                <button className={styles.cancelButton} type="button" onClick={closeNewReport}>Cancelar</button>
                <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Reports;

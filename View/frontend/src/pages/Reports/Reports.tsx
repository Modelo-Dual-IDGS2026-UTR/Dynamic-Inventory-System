import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../utils/auth';
import type { Item, Place, Report, ReportPriority, ReportStatus } from '../../types';
import {
  createReport,
  deleteReport,
  getAllReports,
  getAssignedReports,
  getUserReports,
  updateReportAssignedUser,
  updateReportDueDate,
  updateReportPriority,
  updateReportStatus,
} from '../../services/ReportServices';
import { getItems } from '../../services/ItemServices';
import { getPlaces } from '../../services/PlaceServices';
import { getAllEmployees } from '../../services/EmployeeServices';
import { getAllUsers, type UserAccount } from '../../services/UserServices';
import type { Employee } from '../../types/EmployeeModel';
import { DatePicker } from '../../components/common/DatePicker';
import { ColorSelect, type ColorSelectOption } from '../../components/common/ColorSelect';
import styles from './Reports.module.css';

const statusLabels: Record<ReportStatus, string> = { 1: 'Pendiente', 2: 'En proceso', 3: 'Resuelto' };
const priorityLabels: Record<ReportPriority, string> = { 1: 'Alta', 2: 'Media', 3: 'Baja' };

const statusSelectOptions: ColorSelectOption<ReportStatus>[] = [
  { value: 1, label: 'Pendiente', bgColor: '#fef3c7', textColor: '#92400e', borderColor: '#f59e0b' },
  { value: 2, label: 'En proceso', bgColor: '#dbeafe', textColor: '#1e40af', borderColor: '#3b82f6' },
  { value: 3, label: 'Resuelto', bgColor: '#dcfce7', textColor: '#166534', borderColor: '#22c55e' },
];

const prioritySelectOptions: ColorSelectOption<ReportPriority>[] = [
  { value: 1, label: 'Alta', bgColor: '#fee2e2', textColor: '#b91c1c', borderColor: '#ef4444' },
  { value: 2, label: 'Media', bgColor: '#fef3c7', textColor: '#92400e', borderColor: '#f59e0b' },
  { value: 3, label: 'Baja', bgColor: '#f0fdf4', textColor: '#166534', borderColor: '#22c55e' },
];

function formatDate(value: string): string {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-MX');
}

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const Reports: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.fk_role === 1 || currentUser?.fk_role === 2;
  const isSuperAdmin = currentUser?.fk_role === 1;

  const [reports, setReports] = useState<Report[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState('');

  // Form states for creating a new report
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportPriority, setReportPriority] = useState<ReportPriority>(2);
  const [reportStatus, setReportStatus] = useState<ReportStatus>(1);
  const [dueDate, setDueDate] = useState<string>(getTodayDate());
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const loadReports = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError('');
    try {
      if (isSuperAdmin) {
        // Superadmin: ve todos los reportes del sistema
        setReports(await getAllReports());
      } else if (isAdmin) {
        // Admin: ve los reportes que creó y los reportes que tiene asignados
        const [created, assigned] = await Promise.all([
          getUserReports(currentUser.userId).catch(() => []),
          getAssignedReports(currentUser.userId).catch(() => []),
        ]);
        const map = new Map<number, Report>();
        [...created, ...assigned].forEach((r) => map.set(r.reportId, r));
        setReports(Array.from(map.values()));
      } else {
        // Usuario estándar: solo ve sus propios reportes creados
        setReports(await getUserReports(currentUser.userId));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los reportes.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isAdmin, isSuperAdmin]);

  const loadDemoReports = async () => {
    const demoItems = items.length > 0 ? items : await getItems();
    if (items.length === 0) setItems(demoItems);
    const now = new Date().toISOString();
    const demoReports: Report[] = demoItems.slice(0, 8).map((item, index) => ({
      reportId: 9000 + index,
      reportName: index % 2 === 0 ? 'Mobiliario dañado' : 'Equipo pendiente de revisión',
      reportDescription: index % 2 === 0 ? `El artículo ${item.itemName} requiere atención.` : 'Se solicita verificar el estado del equipo.',
      reportStatus: ([1, 2, 3] as ReportStatus[])[index % 3],
      reportPriority: ([1, 2, 3] as ReportPriority[])[index % 3],
      dueDate: new Date(Date.now() + index * 86400000).toISOString(),
      createdAt: now,
      updatedAt: now,
      fk_user_creator: currentUser?.userId ?? null,
      fk_user_assigned: index % 2 === 0 ? 2 : null,
      xfk_item: item.itemId,
      fk_place: item.fk_place?.placeId ?? null,
    }));
    setReports(demoReports);
    setIsDemoMode(true);
    setError('');
  };

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (isNewReportOpen) {
      if (items.length === 0) {
        getItems().then(setItems).catch(() => setFormMessage('No se pudieron cargar los artículos.'));
      }
      if (places.length === 0) {
        getPlaces().then(setPlaces).catch(() => {});
      }
    }
  }, [isNewReportOpen, items.length, places.length]);

  // Cargar usuarios/empleados cuando hay un modal de gestión abierto o al crear reporte (si es superadmin)
  useEffect(() => {
    if (!isSuperAdmin) return;
    if (isNewReportOpen || selectedReport !== null) {
      if (users.length === 0) {
        setIsLoadingUsers(true);
        getAllUsers()
          .then(setUsers)
          .catch(() => {})
          .finally(() => setIsLoadingUsers(false));
      }
      if (employees.length === 0) {
        getAllEmployees().then(setEmployees).catch(() => {});
      }
    }
  }, [isSuperAdmin, isNewReportOpen, selectedReport, users.length, employees.length]);

  // Map employee accounts / user accounts associated with employees
  const employeeAccounts = useMemo(() => {
    // Priority: users linked to an employee account
    const userEmployeeMap = new Map<number, { userId: number; label: string }>();

    users.forEach((user) => {
      if (user.employeeId || user.employee) {
        const empId = user.employeeId ?? user.employee?.employeeId;
        const empName = `${user.firstName} ${user.lastName}`.trim();
        const area = user.area || user.employee?.area;
        userEmployeeMap.set(user.userId, {
          userId: user.userId,
          label: `${empName} (ID Empleado: #${empId}${area ? ` · ${area}` : ''})`,
        });
      }
    });

    // If users list is still loading or user accounts are returned, also check employee accounts
    if (userEmployeeMap.size > 0) {
      return Array.from(userEmployeeMap.values());
    }

    // Fallback: If no users have employeeId or users couldn't be loaded, show users with employee details or users
    return users.map((user) => ({
      userId: user.userId,
      label: `${user.firstName} ${user.lastName} (${user.email})`,
    }));
  }, [users]);

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
    setReportTitle('');
    setReportPriority(2);
    setReportStatus(1);
    setDueDate(getTodayDate());
    setSelectedPlaceId(null);
    setAssignedUserId(null);
    setReportDetails('');
    setFormMessage('');
  };

  const submitNewReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const finalReportName = (reportTitle || reportReason).trim();
    const finalPlaceId = selectedPlaceId ?? selectedItem?.fk_place?.placeId ?? null;

    if (!currentUser || !selectedItem || !finalReportName || !reportDetails.trim() || !dueDate) {
      setFormMessage('Selecciona un artículo, escribe un título/motivo, fecha límite y describe el problema.');
      return;
    }

    setIsSubmitting(true);
    setFormMessage('');
    try {
      await createReport({
        name: finalReportName,
        reportName: finalReportName,
        description: reportDetails.trim(),
        reportDescription: reportDetails.trim(),
        status: reportStatus,
        reportStatus: reportStatus,
        priority: reportPriority,
        reportPriority: reportPriority,
        dueDate,
        fk_user: currentUser.userId,
        fk_item: selectedItem.itemId,
        fk_place: finalPlaceId,
        fk_user_assigned: assignedUserId,
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
    // Si un admin (no superadmin) intenta marcar como resuelto (3), pedir confirmación
    if (status === 3 && !isSuperAdmin) {
      const confirmed = window.confirm(
        'Marcar como Resuelto requiere autorización/confirmación. ¿Confirmas que cuentas con la aprobación o supervisión de un Superadmin para resolver este reporte?'
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      if (isDemoMode) {
        setReports((currentReports) => currentReports.map((report) => report.reportId === reportId ? { ...report, reportStatus: status } : report));
      } else {
        await updateReportStatus(reportId, status);
        await loadReports();
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el estado.');
    }
  };

  const updatePriority = async (reportId: number, priority: ReportPriority) => {
    try {
      if (isDemoMode) {
        setReports((currentReports) => currentReports.map((report) => report.reportId === reportId ? { ...report, reportPriority: priority } : report));
      } else {
        await updateReportPriority(reportId, priority);
        await loadReports();
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la prioridad.');
    }
  };

  const updateDueDate = async (reportId: number, newDueDate: string) => {
    try {
      if (isDemoMode) {
        setReports((currentReports) => currentReports.map((report) => report.reportId === reportId ? { ...report, dueDate: newDueDate } : report));
      } else {
        await updateReportDueDate(reportId, newDueDate);
        await loadReports();
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la fecha.');
    }
  };

  const updateAssigned = async (reportId: number, newAssignedId: number | null) => {
    try {
      if (isDemoMode) {
        setReports((currentReports) => currentReports.map((report) => report.reportId === reportId ? { ...report, fk_user_assigned: newAssignedId } : report));
      } else {
        await updateReportAssignedUser(reportId, newAssignedId);
        await loadReports();
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el usuario asignado.');
    }
  };

  const handleDelete = async (reportId: number) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el reporte #${reportId}?`)) {
      return;
    }
    try {
      if (isDemoMode) {
        setReports((currentReports) => currentReports.filter((r) => r.reportId !== reportId));
        setSelectedReport(null);
      } else {
        await deleteReport(reportId);
        setSelectedReport(null);
        await loadReports();
      }
    } catch (delError) {
      setError(delError instanceof Error ? delError.message : 'No se pudo eliminar el reporte.');
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
          <button className={styles.actionButton} type="button" onClick={() => { setIsDemoMode(false); void loadReports(); }}>
            Actualizar
          </button>
        </div>
      </header>
      {error && <div className={styles.error}>{error}</div>}
      {isAdmin && error && (
        <div className={styles.demoNotice}>
          <span>El servidor de reportes aún no está disponible.</span>
          <button className={styles.demoButton} type="button" onClick={() => void loadDemoReports()}>
            Cargar datos de demostración
          </button>
        </div>
      )}
      {isAdmin && isDemoMode && <div className={styles.demoMode}>Modo demostración activo: los cambios no se guardan en el servidor.</div>}
      {isAdmin && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.totalIcon}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <line x1="9" y1="11" x2="15" y2="11" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <strong className={styles.statValue}>{reports.length}</strong>
              <span className={styles.statLabel}>Total de reportes</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.criticalIcon}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <strong className={styles.statValue}>{reports.filter((report) => report.reportStatus === 1).length}</strong>
              <span className={styles.statLabel}>Pendientes</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.supportIcon}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <strong className={styles.statValue}>{reports.filter((report) => report.reportStatus === 2).length}</strong>
              <span className={styles.statLabel}>En proceso</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.solvedIcon}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <strong className={styles.statValue}>{reports.filter((report) => report.reportStatus === 3).length}</strong>
              <span className={styles.statLabel}>Resueltos</span>
            </div>
          </div>
        </div>
      )}
      <div className={styles.tableCard}>
        {isLoading ? <div className={styles.message}>Cargando reportes...</div> : reports.length === 0 ? <div className={styles.empty}>No hay reportes para mostrar.</div> : (
          <table className={styles.table}>
            <thead><tr><th>{isAdmin ? 'ID / Reporte' : 'Reporte'}</th><th>Descripción</th><th>Estado</th><th>Prioridad</th><th>Fecha límite</th>{isAdmin && <th>Acciones</th>}</tr></thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.reportId}>
                  <td>{isAdmin ? <><strong>RPT-{report.reportId}</strong><br />{report.reportName}</> : report.reportName}</td>
                  <td>{report.reportDescription}</td>
                  <td>
                    {isAdmin ? (
                      <ColorSelect
                        value={report.reportStatus}
                        options={statusSelectOptions}
                        onChange={(status) => void updateStatus(report.reportId, status)}
                      />
                    ) : <span className={`${styles.badge} ${styles[`status${report.reportStatus}`]}`}>{statusLabels[report.reportStatus]}</span>}
                  </td>
                  <td>
                    {isAdmin ? (
                      <ColorSelect
                        value={report.reportPriority}
                        options={prioritySelectOptions}
                        onChange={(priority) => void updatePriority(report.reportId, priority)}
                      />
                    ) : <span className={styles[`priority${report.reportPriority}`]}>{priorityLabels[report.reportPriority]}</span>}
                  </td>
                  <td>
                    {isAdmin ? (
                      <DatePicker
                        min={getTodayDate()}
                        value={report.dueDate ? report.dueDate.slice(0, 10) : ''}
                        onChange={(val) => {
                          if (val) {
                            void updateDueDate(report.reportId, val);
                          }
                        }}
                      />
                    ) : formatDate(report.dueDate)}
                  </td>
                  {isAdmin && <td><button className={styles.viewButton} type="button" onClick={() => setSelectedReport(report)}>Ver detalle</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedReport && (() => {
        const relatedItem = items.find((i) => i.itemId === selectedReport.xfk_item);
        const relatedPlace = places.find((p) => p.placeId === (selectedReport.fk_place ?? relatedItem?.fk_place?.placeId));
        const assignedAccount = employeeAccounts.find((a) => a.userId === selectedReport.fk_user_assigned);

        return (
          <div className={styles.modalOverlay} onClick={() => setSelectedReport(null)}>
            <div className={styles.adminModal} onClick={(event) => event.stopPropagation()}>
              <button className={styles.closeButton} type="button" onClick={() => setSelectedReport(null)} aria-label="Cerrar detalle">✕</button>

              <div className={styles.adminModalLayout}>
                {/* Columna Izquierda: Información del reporte */}
                <div className={styles.leftColumn}>
                  <div className={styles.modalTitleSection}>
                    <h2>Gestión de Reporte #RPT-{selectedReport.reportId}</h2>
                    <span className={`${styles.badge} ${styles[`status${selectedReport.reportStatus}`]}`}>
                      {statusLabels[selectedReport.reportStatus]}
                    </span>
                  </div>

                  <div className={styles.detailsList}>
                    <div className={styles.detailRow}>
                      <strong>Reporte:</strong>
                      <span>{selectedReport.reportName}</span>
                    </div>

                    <div className={styles.detailRow}>
                      <strong>Descripción:</strong>
                      <p className={styles.descriptionText}>{selectedReport.reportDescription}</p>
                    </div>

                    <div className={styles.detailRow}>
                      <strong>Artículo:</strong>
                      <span>
                        {relatedItem
                          ? `${relatedItem.itemName} (${relatedItem.codeBar || `#${relatedItem.itemId}`})`
                          : (selectedReport.xfk_item ? `Artículo #${selectedReport.xfk_item}` : 'Sin artículo')}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <strong>Ubicación:</strong>
                      <span>
                        {relatedPlace
                          ? `${relatedPlace.placeName}${relatedPlace.placeLocation ? ` (${relatedPlace.placeLocation})` : ''}`
                          : 'Sin ubicación'}
                      </span>
                    </div>

                    {/* Estado y Prioridad abajo junto con todo lo demás */}
                    <div className={styles.detailRow}>
                      <strong>Estado:</strong>
                      {isAdmin ? (
                        <ColorSelect
                          value={selectedReport.reportStatus}
                          options={statusSelectOptions}
                          onChange={(status) => {
                            setSelectedReport({ ...selectedReport, reportStatus: status });
                            void updateStatus(selectedReport.reportId, status);
                          }}
                        />
                      ) : (
                        <span className={styles[`status${selectedReport.reportStatus}`]}>
                          {statusLabels[selectedReport.reportStatus]}
                        </span>
                      )}
                    </div>

                    <div className={styles.detailRow}>
                      <strong>Severidad / Prioridad:</strong>
                      {isAdmin ? (
                        <ColorSelect
                          value={selectedReport.reportPriority}
                          options={prioritySelectOptions}
                          onChange={(priority) => {
                            setSelectedReport({ ...selectedReport, reportPriority: priority });
                            void updatePriority(selectedReport.reportId, priority);
                          }}
                        />
                      ) : (
                        <span className={styles[`priority${selectedReport.reportPriority}`]}>
                          {priorityLabels[selectedReport.reportPriority]}
                        </span>
                      )}
                    </div>

                    <div className={styles.detailRow}>
                      <strong>Fecha límite:</strong>
                      {isAdmin ? (
                        <DatePicker
                          min={getTodayDate()}
                          value={selectedReport.dueDate ? selectedReport.dueDate.slice(0, 10) : ''}
                          onChange={(val) => {
                            if (val) {
                              setSelectedReport({ ...selectedReport, dueDate: val });
                              void updateDueDate(selectedReport.reportId, val);
                            }
                          }}
                        />
                      ) : (
                        <span>{formatDate(selectedReport.dueDate)}</span>
                      )}
                    </div>

                    <div className={styles.detailRow}>
                      <strong>Asignado a:</strong>
                      <span>
                        {assignedAccount
                          ? assignedAccount.label
                          : (selectedReport.fk_user_assigned ? `Usuario #${selectedReport.fk_user_assigned}` : 'Sin asignar')}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <strong>Reporta:</strong>
                      <span>
                        {selectedReport.fk_user_creator
                          ? `Usuario #${selectedReport.fk_user_creator}`
                          : 'Usuario registrado'}
                      </span>
                    </div>

                    <div className={styles.detailRow}>
                      <strong>Fecha de registro:</strong>
                      <span>{formatDate(selectedReport.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Divisor vertical */}
                <div className={styles.modalDivider} />

                {/* Columna Derecha: Panel de acciones similar al diseño */}
                <div className={styles.rightColumn}>
                  {isSuperAdmin && (
                    <div className={styles.controlSection}>
                      <label htmlFor="modalAssignee">Asignado a:</label>
                      {isLoadingUsers ? (
                        <select id="modalAssignee" className={styles.formInput} disabled>
                          <option>Cargando usuarios...</option>
                        </select>
                      ) : (
                        <select
                          id="modalAssignee"
                          className={styles.formInput}
                          value={selectedReport.fk_user_assigned ?? ''}
                          onChange={(event) => {
                            const newAssigned = event.target.value ? Number(event.target.value) : null;
                            setSelectedReport({ ...selectedReport, fk_user_assigned: newAssigned });
                            void updateAssigned(selectedReport.reportId, newAssigned);
                          }}
                        >
                          <option value="">Sin asignar</option>
                          {employeeAccounts.map((account) => (
                            <option key={account.userId} value={account.userId}>
                              {account.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Tarjeta de actividad / comentarios inspirada en la imagen */}
                  <div className={styles.activityCard}>
                    <h4 className={styles.activityCardHeader}>Comentarios / Actividad</h4>
                    <div className={styles.activityItem}>
                      <div className={styles.activityAvatar}>
                        {selectedReport.fk_user_assigned ? 'E' : 'U'}
                      </div>
                      <div className={styles.activityContent}>
                        <strong>{assignedAccount ? assignedAccount.label.split('(')[0].trim() : 'Asignación'}</strong>
                        <span>• Estado: {statusLabels[selectedReport.reportStatus]}</span>
                        <span>• Prioridad: {priorityLabels[selectedReport.reportPriority]}</span>
                      </div>
                    </div>

                    <div className={styles.activityItem}>
                      <div className={`${styles.activityAvatar} ${styles.activityAvatarBlue}`}>
                        A
                      </div>
                      <div className={styles.activityContent}>
                        <strong>Admin comentarios</strong>
                        <span>• Reporte registrado el {formatDate(selectedReport.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className={styles.cancelButton}
                        style={{ color: '#b91c1c', border: '1px solid #fee2e2' }}
                        type="button"
                        onClick={() => void handleDelete(selectedReport.reportId)}
                      >
                        Eliminar reporte
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {isNewReportOpen && (
        <div className={styles.modalOverlay} onClick={closeNewReport}>
          <div className={styles.reportModal} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeButton} type="button" onClick={closeNewReport} aria-label="Cerrar formulario">
              ✕
            </button>
            <h2>Crear reporte nuevo</h2>
            <p className={styles.modalSubtitle}>Selecciona el artículo y describe el problema.</p>

            <label className={styles.formLabel} htmlFor="reportItemSearch">Buscar artículo *</label>
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
                  onClick={() => {
                    setSelectedItem(item);
                    if (item.fk_place?.placeId) {
                      setSelectedPlaceId(item.fk_place.placeId);
                    }
                  }}
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
              <select
                id="newReportReason"
                className={styles.formInput}
                value={reportReason}
                onChange={(event) => {
                  const val = event.target.value;
                  setReportReason(val);
                  if (!reportTitle || reportTitle === 'Mobiliario dañado' || reportTitle === 'Mobiliario faltante' || reportTitle === 'Información incorrecta') {
                    if (val !== 'Otro') {
                      setReportTitle(val);
                    }
                  }
                }}
              >
                <option value="" disabled>Selecciona un motivo</option>
                <option value="Mobiliario dañado">Mobiliario dañado</option>
                <option value="Mobiliario faltante">Mobiliario faltante</option>
                <option value="Información incorrecta">Información incorrecta</option>
                <option value="Otro">Otro motivo</option>
              </select>

              <label className={styles.formLabel} htmlFor="newReportTitle">Título / Nombre del reporte *</label>
              <input
                id="newReportTitle"
                className={styles.formInput}
                type="text"
                placeholder="Ej. Silla de oficina con soporte roto"
                value={reportTitle}
                onChange={(event) => setReportTitle(event.target.value)}
                required
              />

              <label className={styles.formLabel} htmlFor="newReportDueDate">Fecha límite *</label>
              <DatePicker
                className={styles.formDatePicker}
                min={getTodayDate()}
                value={dueDate}
                onChange={(val) => setDueDate(val)}
              />

              <label className={styles.formLabel} htmlFor="newReportPlace">Ubicación / Lugar</label>
              <select
                id="newReportPlace"
                className={styles.formInput}
                value={selectedPlaceId ?? ''}
                onChange={(event) => setSelectedPlaceId(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">Sin ubicación específica</option>
                {places.map((place) => (
                  <option key={place.placeId} value={place.placeId}>
                    {place.placeName}{place.placeLocation ? ` (${place.placeLocation})` : ''}
                  </option>
                ))}
              </select>

              {isSuperAdmin && (
                <>
                  <label className={styles.formLabel} htmlFor="newReportAssigned">Asignar a (cuenta de empleado)</label>
                  <select
                    id="newReportAssigned"
                    className={styles.formInput}
                    value={assignedUserId ?? ''}
                    onChange={(event) => setAssignedUserId(event.target.value ? Number(event.target.value) : null)}
                  >
                    <option value="">Sin asignar</option>
                    {employeeAccounts.map((account) => (
                      <option key={account.userId} value={account.userId}>
                        {account.label}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {isAdmin && (
                <>
                  <label className={styles.formLabel} htmlFor="newReportStatus">Estado inicial</label>
                  <select
                    id="newReportStatus"
                    className={styles.formInput}
                    value={reportStatus}
                    onChange={(event) => setReportStatus(Number(event.target.value) as ReportStatus)}
                  >
                    <option value={1}>Pendiente</option>
                    <option value={2}>En proceso</option>
                    <option value={3}>Resuelto</option>
                  </select>
                </>
              )}

              <label className={styles.formLabel} htmlFor="newReportPriority">Prioridad</label>
              <select
                id="newReportPriority"
                className={styles.formInput}
                value={reportPriority}
                onChange={(event) => setReportPriority(Number(event.target.value) as ReportPriority)}
              >
                <option value={1}>Alta</option>
                <option value={2}>Media</option>
                <option value={3}>Baja</option>
              </select>

              <label className={styles.formLabel} htmlFor="newReportDetails">Detalles / Descripción *</label>
              <textarea
                id="newReportDetails"
                className={styles.formInput}
                rows={4}
                placeholder="Describe el problema a detalle..."
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                required
              />

              {formMessage && <p className={styles.formMessage}>{formMessage}</p>}

              <div className={styles.modalActions}>
                <button className={styles.cancelButton} type="button" onClick={closeNewReport}>
                  Cancelar
                </button>
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

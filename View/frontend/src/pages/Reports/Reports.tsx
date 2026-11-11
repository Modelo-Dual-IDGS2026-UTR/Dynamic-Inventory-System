import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../utils/auth';
import { useView } from '../../context/ViewContext';
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
import { ReportDetailModal } from '../../components/reports/ReportDetailModal';
import { ReportMetrics } from '../../components/reports/ReportMetrics';
import { ReportForm } from '../../components/reports/ReportForm';
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
  const { searchQuery } = useView();
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
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

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

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (items.length === 0) {
      getItems().then(setItems).catch(() => {});
    }
    if (places.length === 0) {
      getPlaces().then(setPlaces).catch(() => {});
    }
  }, [items.length, places.length]);

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

  // Cargar usuarios para mostrar el asignado y empleados para las acciones del superadmin
  useEffect(() => {
    if (!isSuperAdmin && selectedReport === null) return;
    if (isNewReportOpen || selectedReport !== null) {
      if (users.length === 0) {
        setIsLoadingUsers(true);
        getAllUsers()
          .then(setUsers)
          .catch(() => {})
          .finally(() => setIsLoadingUsers(false));
      }
      if (isSuperAdmin && employees.length === 0) {
        getAllEmployees().then(setEmployees).catch(() => {});
      }
    }
  }, [isSuperAdmin, isNewReportOpen, selectedReport, users.length, employees.length]);

  // Map employee accounts / user accounts associated with employees
  const employeeAccounts = useMemo(() => {
    // Priority: users linked to an employee account
    const userEmployeeMap = new Map<number, { userId: number; label: string }>();

    users.forEach((user) => {
      if ((user.employeeId !== null && user.employeeId !== undefined) || user.employee) {
        const empId = user.employeeId ?? user.employee?.employeeId;
        const empName = `${user.firstName} ${user.lastName}`.trim();
        
        let suffixParts: string[] = [];
        if (empId !== undefined && empId !== null) {
          suffixParts.push(`ID Empleado: #${empId}`);
        }
        if (user.universityId) {
          suffixParts.push(`ST-${user.universityId}`);
        }

        userEmployeeMap.set(user.userId, {
          userId: user.userId,
          label: `${empName}${suffixParts.length > 0 ? ' (' + suffixParts.join(' · ') + ')' : ''}`,
        });
      }
    });

    return Array.from(userEmployeeMap.values());
  }, [users]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
    if (!normalizedSearch) return reports;

    return reports.filter((report) => [
      report.reportId,
      `RPT-${report.reportId}`,
      report.reportName,
      report.reportDescription,
      statusLabels[report.reportStatus],
      priorityLabels[report.reportPriority],
      report.assignedUserName,
      report.creatorUserName,
      items.find((item) => item.itemId === report.xfk_item)?.itemName,
      places.find((place) => place.placeId === report.fk_place)?.placeName,
      places.find((place) => place.placeId === report.fk_place)?.placeLocation,
    ].join(' ').toLocaleLowerCase().includes(normalizedSearch));
  }, [items, places, reports, searchQuery]);

  const closeNewReport = () => {
    if (isSubmitting) return;
    setIsNewReportOpen(false);
    setSelectedItem(null);
    setFormMessage('');
  };

  const submitNewReport = async (payload: Parameters<typeof createReport>[0]) => {
    if (!currentUser || !payload.name || !payload.description || !payload.fk_item || !payload.dueDate) {
      setFormMessage('Selecciona un artículo, escribe un título/motivo, fecha límite y describe el problema.');
      return;
    }

    setIsSubmitting(true);
    setFormMessage('');
    try {
      await createReport(payload);
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

  const updateDueDate = async (reportId: number, newDueDate: string) => {
    try {
      await updateReportDueDate(reportId, newDueDate);
      await loadReports();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la fecha.');
    }
  };

  const updateAssigned = async (reportId: number, newAssignedId: number | null) => {
    try {
      await updateReportAssignedUser(reportId, newAssignedId);
      await loadReports();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el usuario asignado.');
    }
  };

  const handleDelete = async (reportId: number) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el reporte #${reportId}?`)) {
      return;
    }
    try {
      await deleteReport(reportId);
      setSelectedReport(null);
      await loadReports();
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
          <button className={styles.actionButton} type="button" onClick={() => void loadReports()}>
            Actualizar
          </button>
        </div>
      </header>
      {error && <div className={styles.error}>{error}</div>}
      {isAdmin && <ReportMetrics reports={reports} />}
      <div className={styles.tableCard}>
        {isLoading ? <div className={styles.message}>Cargando reportes...</div> : filteredReports.length === 0 ? <div className={styles.empty}>{reports.length === 0 ? 'No hay reportes para mostrar.' : 'No se encontraron reportes.'}</div> : (
          <table className={styles.table}>
            <thead><tr><th>{isAdmin ? 'ID / Reporte' : 'Reporte'}</th><th>Descripción</th><th>Estado</th><th>Prioridad</th><th>Fecha límite</th><th>{isAdmin ? 'Acciones' : 'Detalle'}</th></tr></thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.reportId}>
                  <td>{isAdmin ? <><strong>RPT-{report.reportId}</strong><br />{report.reportName}</> : report.reportName}</td>
                  <td>{report.reportDescription}</td>
                  <td>
                    {isAdmin ? (
                      <ColorSelect
                        value={report.reportStatus}
                        options={statusSelectOptions}
                        disableSelectedOption
                        onChange={(status) => void updateStatus(report.reportId, status)}
                      />
                    ) : <span className={`${styles.badge} ${styles[`status${report.reportStatus}`]}`}>{statusLabels[report.reportStatus]}</span>}
                  </td>
                  <td>
                    {isSuperAdmin ? (
                      <ColorSelect
                        value={report.reportPriority}
                        options={prioritySelectOptions}
                        disableSelectedOption
                        onChange={(priority) => void updatePriority(report.reportId, priority)}
                      />
                    ) : <span className={styles[`priority${report.reportPriority}`]}>{priorityLabels[report.reportPriority]}</span>}
                  </td>
                  <td>
                    {isSuperAdmin ? (
                      <DatePicker
                        min={getTodayDate()}
                        value={report.dueDate ? report.dueDate.slice(0, 10) : ''}
                        disabledValue={report.dueDate}
                        onChange={(val) => {
                          if (val && val !== report.dueDate.slice(0, 10)) {
                            void updateDueDate(report.reportId, val);
                          }
                        }}
                      />
                    ) : formatDate(report.dueDate)}
                  </td>
                  <td><button className={styles.viewButton} type="button" onClick={() => setSelectedReport(report)}>Ver detalle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          relatedItem={items.find((item) => item.itemId === selectedReport.xfk_item)}
          relatedPlace={places.find((place) => place.placeId === (selectedReport.fk_place ?? items.find((item) => item.itemId === selectedReport.xfk_item)?.fk_place?.placeId))}
          assignedAccount={employeeAccounts.find((account) => account.userId === selectedReport.fk_user_assigned)}
          employeeAccounts={employeeAccounts}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          isLoadingUsers={isLoadingUsers}
          assigneeSearch={assigneeSearch}
          isAssigneeDropdownOpen={isAssigneeDropdownOpen}
          statusLabels={statusLabels}
          priorityLabels={priorityLabels}
          statusOptions={statusSelectOptions}
          priorityOptions={prioritySelectOptions}
          formatDate={formatDate}
          getTodayDate={getTodayDate}
          onClose={() => setSelectedReport(null)}
          onReportChange={setSelectedReport}
          onAssigneeSearchChange={setAssigneeSearch}
          onAssigneeDropdownChange={setIsAssigneeDropdownOpen}
          onStatusChange={(status) => void updateStatus(selectedReport.reportId, status)}
          onPriorityChange={(priority) => void updatePriority(selectedReport.reportId, priority)}
          onDueDateChange={(date) => void updateDueDate(selectedReport.reportId, date)}
          onAssignedChange={(userId) => {
            setSelectedReport({ ...selectedReport, fk_user_assigned: userId });
            setAssigneeSearch('');
            setIsAssigneeDropdownOpen(false);
            void updateAssigned(selectedReport.reportId, userId);
          }}
          onDelete={() => void handleDelete(selectedReport.reportId)}
        />
      )}
      {isNewReportOpen && (
        <div className={styles.modalOverlay} onClick={closeNewReport}>
          <div className={styles.reportModal} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeButton} type="button" onClick={closeNewReport} aria-label="Cerrar formulario">
              ✕
            </button>
            <h2>Crear reporte nuevo</h2>
            <p className={styles.modalSubtitle}>Selecciona el artículo y describe el problema.</p>

            <ReportForm
              items={items}
              places={places}
              userId={currentUser?.userId ?? 0}
              employeeAccounts={employeeAccounts}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              isSubmitting={isSubmitting}
              message={formMessage}
              onSubmit={submitNewReport}
              onValidationError={setFormMessage}
              onCancel={closeNewReport}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default Reports;

import React from 'react';
import type { Item, Place, Report, ReportPriority, ReportStatus } from '../../types';
import { ColorSelect, type ColorSelectOption } from '../common/ColorSelect';
import { DatePicker } from '../common/DatePicker';
import { EmployeeAutocomplete, type EmployeeAccountOption } from './EmployeeAutocomplete';
import styles from '../../pages/Reports/Reports.module.css';

interface ReportDetailModalProps {
  report: Report;
  relatedItem?: Item;
  relatedPlace?: Place;
  assignedAccount?: EmployeeAccountOption;
  employeeAccounts: EmployeeAccountOption[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoadingUsers: boolean;
  assigneeSearch: string;
  isAssigneeDropdownOpen: boolean;
  statusLabels: Record<ReportStatus, string>;
  priorityLabels: Record<ReportPriority, string>;
  statusOptions: ColorSelectOption<ReportStatus>[];
  priorityOptions: ColorSelectOption<ReportPriority>[];
  formatDate: (value: string) => string;
  getTodayDate: () => string;
  onClose: () => void;
  onReportChange: (report: Report) => void;
  onAssigneeSearchChange: (value: string) => void;
  onAssigneeDropdownChange: (isOpen: boolean) => void;
  onStatusChange: (status: ReportStatus) => void;
  onPriorityChange: (priority: ReportPriority) => void;
  onDueDateChange: (date: string) => void;
  onAssignedChange: (userId: number | null) => void;
  onDelete: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  relatedItem,
  relatedPlace,
  assignedAccount,
  employeeAccounts,
  isAdmin,
  isSuperAdmin,
  isLoadingUsers,
  assigneeSearch,
  isAssigneeDropdownOpen,
  statusLabels,
  priorityLabels,
  statusOptions,
  priorityOptions,
  formatDate,
  getTodayDate,
  onClose,
  onReportChange,
  onAssigneeSearchChange,
  onAssigneeDropdownChange,
  onStatusChange,
  onPriorityChange,
  onDueDateChange,
  onAssignedChange,
  onDelete,
}) => {
  const creatorName = report.creatorUserName || `Usuario #${report.fk_user_creator ?? ''}`;
  const creatorExtra = report.creatorEmployeeId !== null && report.creatorEmployeeId !== undefined
    ? `(ID Empleado: #${report.creatorEmployeeId}${report.creatorUniversityId ? ` · ST-${report.creatorUniversityId}` : ''})`
    : report.creatorUniversityId ? `(ST-${report.creatorUniversityId})` : '';
  const assignedName = assignedAccount?.label.split(' (')[0] || report.assignedUserName || `Usuario #${report.fk_user_assigned}`;
  const assignedExtra = report.assignedEmployeeId !== null && report.assignedEmployeeId !== undefined
    ? `(ID Empleado: #${report.assignedEmployeeId}${report.assignedUniversityId ? ` · ST-${report.assignedUniversityId}` : ''})`
    : report.assignedUniversityId ? `(ST-${report.assignedUniversityId})` : '';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.adminModal} onClick={(event) => event.stopPropagation()}>
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Cerrar detalle">✕</button>
        <div className={styles.adminModalLayout}>
          <div className={styles.leftColumn}>
            <div className={styles.modalTitleSection}>
              <h2>Gestión de Reporte #RPT-{report.reportId}</h2>
              <span className={`${styles.badge} ${styles[`status${report.reportStatus}`]}`}>{statusLabels[report.reportStatus]}</span>
            </div>
            <div className={styles.detailsList}>
              <div className={styles.detailRow}><strong>Reporte:</strong><span>{report.reportName}</span></div>
              <div className={styles.detailRow}><strong>Descripción:</strong><p className={styles.descriptionText}>{report.reportDescription}</p></div>
              <div className={styles.detailRow}>
                <strong>Artículo:</strong>
                <span>{relatedItem ? `${relatedItem.itemName} (${relatedItem.codeBar || `#${relatedItem.itemId}`})` : (report.xfk_item ? `Artículo #${report.xfk_item}` : 'Sin artículo')}</span>
              </div>
              <div className={styles.detailRow}>
                <strong>Ubicación:</strong>
                <span>{relatedPlace ? `${relatedPlace.placeName}${relatedPlace.placeLocation ? ` (${relatedPlace.placeLocation})` : ''}` : 'Sin ubicación'}</span>
              </div>
              <div className={styles.detailRow}>
                <strong>Estado:</strong>
                {isAdmin ? <ColorSelect value={report.reportStatus} options={statusOptions} onChange={(status) => {
                  onReportChange({ ...report, reportStatus: status });
                  onStatusChange(status);
                }} /> : <span className={styles[`status${report.reportStatus}`]}>{statusLabels[report.reportStatus]}</span>}
              </div>
              <div className={styles.detailRow}>
                <strong>Severidad / Prioridad:</strong>
                {isSuperAdmin ? <ColorSelect value={report.reportPriority} options={priorityOptions} onChange={(priority) => {
                  onReportChange({ ...report, reportPriority: priority });
                  onPriorityChange(priority);
                }} /> : <span className={styles[`priority${report.reportPriority}`]}>{priorityLabels[report.reportPriority]}</span>}
              </div>
              <div className={styles.detailRow}>
                <strong>Fecha límite:</strong>
                {isSuperAdmin ? <DatePicker min={getTodayDate()} value={report.dueDate ? report.dueDate.slice(0, 10) : ''} onChange={(date) => {
                  if (date) {
                    onReportChange({ ...report, dueDate: date });
                    onDueDateChange(date);
                  }
                }} /> : <span>{formatDate(report.dueDate)}</span>}
              </div>
              <div className={styles.detailRow}><strong>Asignado a:</strong><span>{report.fk_user_assigned ? `${assignedName} ${assignedExtra}`.trim() : 'Sin asignar'}</span></div>
              <div className={styles.detailRow}><strong>Reporta:</strong><span>{report.fk_user_creator ? `${creatorName} ${creatorExtra}`.trim() : 'Usuario registrado'}</span></div>
              <div className={styles.detailRow}><strong>Fecha de registro:</strong><span>{formatDate(report.createdAt)}</span></div>
            </div>
          </div>
          <div className={styles.modalDivider} />
          <div className={styles.rightColumn}>
            {isSuperAdmin && (
              <div className={styles.controlSection}>
                <label htmlFor="modalAssigneeSearch">Asignado a:</label>
                <EmployeeAutocomplete
                  accounts={employeeAccounts}
                  value={report.fk_user_assigned}
                  search={assigneeSearch}
                  isOpen={isAssigneeDropdownOpen}
                  isLoading={isLoadingUsers}
                  onSearchChange={onAssigneeSearchChange}
                  onOpenChange={onAssigneeDropdownChange}
                  onChange={onAssignedChange}
                />
              </div>
            )}
            <div className={styles.activityCard}>
              <h4 className={styles.activityCardHeader}>Comentarios / Actividad</h4>
              <div className={styles.activityItem}>
                <div className={styles.activityAvatar}>{report.fk_user_assigned ? 'E' : 'U'}</div>
                <div className={styles.activityContent}>
                  <strong>{assignedAccount ? assignedAccount.label.split('(')[0].trim() : 'Asignación'}</strong>
                  <span>• Estado: {statusLabels[report.reportStatus]}</span>
                  <span>• Prioridad: {priorityLabels[report.reportPriority]}</span>
                </div>
              </div>
              <div className={styles.activityItem}>
                <div className={`${styles.activityAvatar} ${styles.activityAvatarBlue}`}>A</div>
                <div className={styles.activityContent}><strong>Admin comentarios</strong><span>• Reporte registrado el {formatDate(report.createdAt)}</span></div>
              </div>
            </div>
            {isSuperAdmin && <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              <button className={styles.cancelButton} style={{ color: '#b91c1c', border: '1px solid #fee2e2' }} type="button" onClick={onDelete}>Eliminar reporte</button>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
};

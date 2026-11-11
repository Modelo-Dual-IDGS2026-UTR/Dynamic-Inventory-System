import React, { useEffect, useMemo, useState } from 'react';
import type { Item, Place, ReportPriority, ReportStatus, CreateReportPayload } from '../../types';
import { DatePicker } from '../common/DatePicker';
import { EmployeeAutocomplete } from './EmployeeAutocomplete';
import styles from './ReportForm.module.css';

interface EmployeeAccount {
  userId: number;
  label: string;
}

interface ReportFormProps {
  items: Item[];
  places: Place[];
  userId: number;
  initialItem?: Item | null;
  employeeAccounts?: EmployeeAccount[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isSubmitting: boolean;
  message: string;
  onSubmit: (payload: CreateReportPayload) => void | Promise<void>;
  onValidationError: (message: string) => void;
  onCancel: () => void;
}

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const ReportForm: React.FC<ReportFormProps> = ({
  items,
  places,
  userId,
  initialItem = null,
  employeeAccounts = [],
  isAdmin = false,
  isSuperAdmin = false,
  isSubmitting,
  message,
  onSubmit,
  onValidationError,
  onCancel,
}) => {
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(initialItem);
  const [reportReason, setReportReason] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportPriority, setReportPriority] = useState<ReportPriority>(2);
  const [reportStatus, setReportStatus] = useState<ReportStatus>(1);
  const [dueDate, setDueDate] = useState(getTodayDate());
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(initialItem?.fk_place?.placeId ?? null);
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    setSelectedItem(initialItem);
    setSelectedPlaceId(initialItem?.fk_place?.placeId ?? null);
  }, [initialItem]);

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const finalReportName = (reportTitle || reportReason).trim();
    const finalPlaceId = selectedPlaceId ?? selectedItem?.fk_place?.placeId ?? null;

    if (!selectedItem || !finalReportName || !reportDetails.trim() || !dueDate) {
      onValidationError('Selecciona un artículo, escribe un título/motivo, fecha límite y describe el problema.');
      return;
    }

    void onSubmit({
      name: finalReportName,
      reportName: finalReportName,
      description: reportDetails.trim(),
      reportDescription: reportDetails.trim(),
      status: reportStatus,
      reportStatus,
      priority: reportPriority,
      reportPriority,
      dueDate,
      fk_user: userId,
      fk_item: selectedItem.itemId,
      fk_place: finalPlaceId,
      fk_user_assigned: assignedUserId,
    });
  };

  return (
    <>
      <label className={styles.formLabel} htmlFor="reportItemSearch">Buscar artículo *</label>
      {!initialItem && (
        <>
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
                  setSelectedPlaceId(item.fk_place?.placeId ?? null);
                }}
              >
                <strong>{item.itemName}</strong>
                <span>{item.codeBar || 'Sin código'} · {item.fk_place?.placeName || 'Sin ubicación'}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <form className={styles.reportForm} onSubmit={handleSubmit}>
        <p className={styles.selectedItemText}>
          {selectedItem ? `Artículo seleccionado: ${selectedItem.itemName}` : 'Ningún artículo seleccionado'}
        </p>

        <label className={styles.formLabel} htmlFor="reportReason">Motivo del reporte</label>
        <select
          id="reportReason"
          className={styles.formInput}
          value={reportReason}
          onChange={(event) => {
            const value = event.target.value;
            setReportReason(value);
            if (!reportTitle || ['Mobiliario dañado', 'Mobiliario faltante', 'Información incorrecta'].includes(reportTitle)) {
              if (value !== 'Otro') setReportTitle(value);
            }
          }}
        >
          <option value="" disabled>Selecciona un motivo</option>
          <option value="Mobiliario dañado">Mobiliario dañado</option>
          <option value="Mobiliario faltante">Mobiliario faltante</option>
          <option value="Información incorrecta">Información incorrecta</option>
          <option value="Otro">Otro motivo</option>
        </select>

        <label className={styles.formLabel} htmlFor="reportTitle">Título / Nombre del reporte *</label>
        <input
          id="reportTitle"
          className={styles.formInput}
          type="text"
          placeholder="Ej. Silla de oficina con soporte roto"
          value={reportTitle}
          onChange={(event) => setReportTitle(event.target.value)}
          required
        />

        <label className={styles.formLabel} htmlFor="reportDueDate">Fecha límite *</label>
        <DatePicker className={styles.formDatePicker} min={getTodayDate()} value={dueDate} onChange={setDueDate} />

        <label className={styles.formLabel} htmlFor="reportPlace">Ubicación / Lugar</label>
        <select
          id="reportPlace"
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
            <label className={styles.formLabel} htmlFor="modalAssigneeSearch">Asignar a (cuenta de empleado)</label>
            <EmployeeAutocomplete
              accounts={employeeAccounts}
              value={assignedUserId}
              search={assigneeSearch}
              isOpen={isAssigneeDropdownOpen}
              onSearchChange={setAssigneeSearch}
              onOpenChange={setIsAssigneeDropdownOpen}
              onChange={(userId) => {
                setAssignedUserId(userId);
                setAssigneeSearch('');
                setIsAssigneeDropdownOpen(false);
              }}
            />
          </>
        )}

        {isAdmin && (
          <>
            <label className={styles.formLabel} htmlFor="reportStatus">Estado inicial</label>
            <select id="reportStatus" className={styles.formInput} value={reportStatus} onChange={(event) => setReportStatus(Number(event.target.value) as ReportStatus)}>
              <option value={1}>Pendiente</option>
              <option value={2}>En proceso</option>
              <option value={3}>Resuelto</option>
            </select>
          </>
        )}

        {isSuperAdmin && (
          <>
            <label className={styles.formLabel} htmlFor="reportPriority">Prioridad</label>
            <select
              id="reportPriority"
              className={styles.formInput}
              value={reportPriority}
              onChange={(event) => setReportPriority(Number(event.target.value) as ReportPriority)}
            >
              <option value={1}>Alta</option>
              <option value={2}>Media</option>
              <option value={3}>Baja</option>
            </select>
          </>
        )}

        <label className={styles.formLabel} htmlFor="reportDetails">Detalles / Descripción *</label>
        <textarea id="reportDetails" className={styles.formInput} rows={4} placeholder="Describe el problema a detalle..." value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} required />

        {message && <p className={styles.formMessage}>{message}</p>}
        <div className={styles.formActions}>
          <button className={styles.cancelButton} type="button" onClick={onCancel}>Cancelar</button>
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : 'Enviar reporte'}</button>
        </div>
      </form>
    </>
  );
};

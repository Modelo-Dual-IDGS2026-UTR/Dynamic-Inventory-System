import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useView } from '../../context/ViewContext';
import styles from './Inventario.module.css';
import ItemTable from './ItemTable';
import CardGrid from './CardGrid';
import type { Item } from '../../types';
import { getItems } from '../../services/ItemServices';
import { createReport } from '../../services/ReportServices';
import { useAuth } from '../../utils/auth';
import type { ReportPriority } from '../../types';

export const Inventory: React.FC = () => {
  const {
    viewType,
    searchQuery,
    categoryFilter,
    placeFilter,
    setCategoryOptions,
    setPlaceOptions,
  } = useView();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportPriority, setReportPriority] = useState<ReportPriority>(2);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState('');

  useEffect(() => {
    getItems().then(setItems);
  }, []);

  const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean)));
  const places = Array.from(new Set(items.map((item) => item.fk_place?.placeName).filter(Boolean)));
  useEffect(() => {
    setCategoryOptions(categories);
    setPlaceOptions(places);
  }, [items]);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredItems = items.filter((item) => {
    const searchableText = [
      item.itemName,
      item.itemDescription,
      item.manufacter,
      item.codeBar,
      item.category,
      item.fk_place?.placeName,
    ].join(' ').toLocaleLowerCase();
    const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesPlace = !placeFilter || item.fk_place?.placeName === placeFilter;
    return matchesSearch && matchesCategory && matchesPlace;
  });

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isReportOpen) {
          setIsReportOpen(false);
        } else {
          setSelectedItem(null);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isReportOpen]);

  const submitReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem || !currentUser || !reportReason || !reportDetails.trim()) {
      setReportMessage('Selecciona un motivo y describe el problema.');
      return;
    }
    setIsSubmittingReport(true);
    setReportMessage('');
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
      setReportMessage('Reporte enviado correctamente.');
      setReportReason('');
      setReportDetails('');
    } catch (submitError) {
      setReportMessage(submitError instanceof Error ? submitError.message : 'No se pudo enviar el reporte.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconRed}`}>🪑</div>
          <div className={styles.statInfo}><span className={styles.statLabel}>Total de Mobiliario</span><span className={styles.statValue}>{items.length}</span><span className={styles.statSubtext}>Todos los ítems registrados</span></div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>✓</div>
          <div className={styles.statInfo}><span className={styles.statLabel}>En Uso</span><span className={styles.statValue}>980</span><span className={styles.statSubtext}>78.4% del total</span></div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconYellow}`}>▣</div>
          <div className={styles.statInfo}><span className={styles.statLabel}>En Bodega</span><span className={styles.statValue}>210</span><span className={styles.statSubtext}>16.8% del total</span></div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconWarning}`}>!</div>
          <div className={styles.statInfo}><span className={styles.statLabel}>Dañado</span><span className={styles.statValue}>60</span><span className={styles.statSubtext}>4.8% del total</span></div>
        </div>
      </div>

      <div className={styles.dataContainer}>
        {viewType === 'tabla' ? (
          <div className={styles.tablePlaceholderCard}>
            <ItemTable items={filteredItems} onSelectItem={setSelectedItem} />
          </div>
        ) : (
          <CardGrid items={filteredItems} onSelectItem={setSelectedItem} />
        )}
      </div>

      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeBtn} type="button" onClick={() => setSelectedItem(null)} aria-label="Cerrar detalle">✕</button>
            <div className={styles.modalBody}>
              <div className={styles.modalLeftColumn}>
                <h2>{selectedItem.itemName}</h2>
                <div className={styles.infoPill}>ID: {selectedItem.itemId}</div>
                <div className={styles.infoPill}>Descripción: {selectedItem.itemDescription}</div>
                <div className={styles.infoPill}>Fabricante: {selectedItem.manufacter}</div>
                <div className={styles.infoPill}>Costo: ${selectedItem.cost.toFixed(2)}</div>
                <div className={styles.infoPill}>Categoría: {selectedItem.category}</div>
                <div className={styles.infoPill}>Código: {selectedItem.codeBar || 'N/A'}</div>
              </div>
              <div className={styles.modalRightColumn}>
                <button className={styles.reportBtn} type="button" onClick={() => setIsReportOpen(true)}>📈 Reportar</button>
                <button className={styles.requestBtn} type="button" onClick={() => navigate('/Dashboard/solicitudes')}>📝 Solicitar</button>
                <div className={styles.historyCard}><h3>Historial</h3></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isReportOpen && selectedItem && (
        <div className={styles.reportOverlay} onClick={() => setIsReportOpen(false)}>
          <div className={styles.reportModal} onClick={(event) => event.stopPropagation()}>
            <button
              className={styles.closeBtn}
              type="button"
              onClick={() => setIsReportOpen(false)}
              aria-label="Cerrar reporte"
            >
              ✕
            </button>
            <h2>Reportar mobiliario</h2>
            <p className={styles.reportItem}>Artículo: {selectedItem.itemName}</p>
            <form className={styles.reportForm} onSubmit={submitReport}>
              <label htmlFor="reportReason">Motivo del reporte</label>
              <select id="reportReason" name="reportReason" value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                <option value="" disabled>Selecciona un motivo</option>
                <option value="damaged">Mobiliario dañado</option>
                <option value="missing">Mobiliario faltante</option>
                <option value="incorrect">Información incorrecta</option>
              </select>
              <label htmlFor="reportPriority">Prioridad</label>
              <select id="reportPriority" name="reportPriority" value={reportPriority} onChange={(event) => setReportPriority(Number(event.target.value) as ReportPriority)}>
                <option value={1}>Alta</option>
                <option value={2}>Media</option>
                <option value={3}>Baja</option>
              </select>
              <label htmlFor="reportDetails">Detalles</label>
              <textarea
                id="reportDetails"
                name="reportDetails"
                rows={4}
                placeholder="Describe el problema"
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
              />
              {reportMessage && <p className={styles.reportMessage}>{reportMessage}</p>}
              <div className={styles.reportActions}>
                <button className={styles.cancelBtn} type="button" onClick={() => setIsReportOpen(false)}>
                  Cancelar
                </button>
                <button className={styles.submitReportBtn} type="submit" disabled={isSubmittingReport}>
                  {isSubmittingReport ? 'Enviando...' : 'Enviar reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

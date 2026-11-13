import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../utils/auth';
import type { InventoryRequest, Item, RequestStatus } from '../../types';
import { acceptRequest, createRequest, getAllRequests, getReceivedRequests, getUserRequests, rejectRequest } from '../../services/RequestServices';
import { getItems } from '../../services/ItemServices';
import styles from './Requests.module.css';

const statusLabels: Record<RequestStatus, string> = { 1: 'Pendiente', 2: 'Aceptada', 3: 'Rechazada' };

type RequestView = 'usuario' | 'admin' | 'superadmin';

interface RequestsProps {
  view?: RequestView;
}

const viewContent: Record<RequestView, { title: string; subtitle: string }> = {
  usuario: { title: 'Mis solicitudes', subtitle: 'Consulta el seguimiento de tus solicitudes y resguardos.' },
  admin: { title: 'Solicitudes recibidas', subtitle: 'Gestiona las solicitudes relacionadas con tus resguardos.' },
  superadmin: { title: 'Solicitudes globales', subtitle: 'Revisa y administra todas las solicitudes del inventario.' },
};

const roleForView: Record<RequestView, number> = { usuario: 3, admin: 2, superadmin: 1 };

export const Requests: React.FC<RequestsProps> = ({ view }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const role = Number(currentUser?.fk_role);
  const currentView: RequestView = view ?? (role === 1 ? 'superadmin' : role === 2 ? 'admin' : 'usuario');
  const isUnauthorizedView = Boolean(currentUser && (role > 2 || role !== roleForView[currentView]));
  const isAdmin = role <= 2;
  const content = viewContent[currentView];
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [showCompleteHistory, setShowCompleteHistory] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [requestName, setRequestName] = useState('');
  const [description, setDescription] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError('');
    try {
      if (currentView === 'superadmin') {
        setRequests(await getAllRequests());
      } else if (currentView === 'admin') {
        const [created, received] = await Promise.all([
          getUserRequests(currentUser.userId),
          getReceivedRequests(currentUser.userId),
        ]);
        const requestMap = new Map<number, InventoryRequest>();
        [...created, ...received].forEach((request) => requestMap.set(request.requestId, request));
        setRequests(Array.from(requestMap.values()));
      } else {
        setRequests(await getUserRequests(currentUser.userId));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las solicitudes.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, currentView]);

  useEffect(() => {
    void loadRequests();
    getItems().then(setItems).catch(() => setError('No se pudieron cargar los artículos para solicitar.'));
  }, [loadRequests]);

  useEffect(() => {
    const itemId = (location.state as { itemId?: number } | null)?.itemId;
    if (itemId && items.some((item) => item.itemId === itemId)) {
      setSelectedItemId(itemId);
      setIsFormOpen(true);
    }
  }, [items, location.state]);

  const selectedItem = useMemo(
    () => items.find((item) => item.itemId === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const ownCustodyRequests = useMemo(
    () => requests.filter((request) => request.requestStatus === 2 && request.fk_user_requester === currentUser?.userId),
    [currentUser?.userId, requests],
  );
  const personalHistoryRequests = useMemo(
    () => requests.filter((request) => request.fk_user_requester === currentUser?.userId),
    [currentUser?.userId, requests],
  );
  const historyRequests = currentView === 'superadmin' && showCompleteHistory
    ? requests
    : personalHistoryRequests;

  const openForm = () => {
    setFormMessage('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setFormMessage('');
  };

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const receiverId = selectedItem?.fk_user_responsible?.id;
    if (!currentUser || !selectedItemId || !selectedItem || !requestName.trim() || !description.trim()) {
      setFormMessage('Selecciona un artículo, escribe el motivo y describe la solicitud.');
      return;
    }
    if (!receiverId) {
      setFormMessage('El artículo seleccionado no tiene un responsable al cual enviar la solicitud.');
      return;
    }

    setIsSubmitting(true);
    setFormMessage('');
    try {
      await createRequest({
        name: requestName.trim(),
        description: description.trim(),
        status: 1,
        fk_item: selectedItem.itemId,
        fk_user: receiverId,
        fk_category: typeof selectedItem.category === 'object' && selectedItem.category ? selectedItem.category.id : 0,
      });
      setRequestName('');
      setDescription('');
      setSelectedItemId('');
      closeForm();
      await loadRequests();
    } catch (submitError) {
      setFormMessage(submitError instanceof Error ? submitError.message : 'No se pudo enviar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeRequestStatus = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') await acceptRequest(requestId);
      else await rejectRequest(requestId);
      await loadRequests();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar la solicitud.');
    }
  };

  if (isUnauthorizedView) return <Navigate to="/Dashboard" replace />;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div><h1>{content.title}</h1><p className={styles.subtitle}>{content.subtitle}</p></div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} type="button" onClick={openForm}>+ Solicitar resguardo</button>
          <button className={styles.refreshButton} type="button" onClick={() => void loadRequests()}>Actualizar</button>
        </div>
      </header>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.metrics}>
        <span><strong>{requests.length}</strong> solicitudes</span>
        <span><strong>{requests.filter((request) => request.requestStatus === 1).length}</strong> pendientes</span>
        <span><strong>{requests.filter((request) => request.requestStatus === 2).length}</strong> aceptadas</span>
      </div>
      <div className={styles.contentLayout}>
      <div className={styles.tableCard}>
        {isLoading ? <div className={styles.message}>Cargando solicitudes...</div> : requests.length === 0 ? <div className={styles.empty}>No hay solicitudes para mostrar.</div> : (
          <table className={styles.table}>
            <thead><tr><th>Solicitud</th><th>Artículo</th><th>{currentView === 'usuario' ? 'Responsable' : 'Solicitante'}</th><th>Estado</th><th>Creada</th>{isAdmin && <th>Resolver</th>}</tr></thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.requestId}>
                  <td><strong>REQ-{request.requestId}</strong><br />{request.name}</td>
                  <td>{request.itemName || 'Artículo no disponible'}</td>
                  <td>{currentView === 'usuario' ? request.receiverName || 'Sin responsable' : request.requesterName || 'Sin solicitante'}</td>
                  <td><span className={`${styles.badge} ${styles[`status${request.requestStatus}`]}`}>{statusLabels[request.requestStatus]}</span></td>
                  <td>{request.createdAt ? new Date(request.createdAt).toLocaleDateString('es-MX') : 'Sin fecha'}</td>
                  {isAdmin && <td>{request.requestStatus === 1 && request.fk_user_requester !== currentUser?.userId && <div className={styles.actions}><button className={styles.actionButton} type="button" onClick={() => void changeRequestStatus(request.requestId, 'accept')}>Aceptar</button><button className={styles.dangerButton} type="button" onClick={() => void changeRequestStatus(request.requestId, 'reject')}>Rechazar</button></div>}{request.requestStatus === 1 && request.fk_user_requester === currentUser?.userId && <span className={styles.noAction}>No puedes aceptar tu propia solicitud</span>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className={styles.historyLayout}>
        <section className={styles.historyCard}>
          <div className={styles.historyHeader}>
            <div>
              <h2>Mis resguardos</h2>
              <p>Artículos aceptados y asignados a tu cuenta.</p>
            </div>
          </div>
          {ownCustodyRequests.length === 0 ? <div className={styles.empty}>No tienes resguardos aceptados.</div> : (
            <div className={styles.miniTableWrapper}>
              <table className={styles.miniTable}>
                <thead><tr><th>Artículo</th><th>Solicitud</th><th>Estado</th><th>Fecha</th></tr></thead>
                <tbody>{ownCustodyRequests.map((request) => <tr key={request.requestId}><td>{request.itemName || 'Artículo no disponible'}</td><td>{request.name}</td><td><span className={`${styles.badge} ${styles[`status${request.requestStatus}`]}`}>{statusLabels[request.requestStatus]}</span></td><td>{request.createdAt ? new Date(request.createdAt).toLocaleDateString('es-MX') : 'Sin fecha'}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
        {isAdmin && (
          <section className={styles.historyCard}>
            <div className={styles.historyHeader}>
              <div>
                <h2>{currentView === 'superadmin' && showCompleteHistory ? 'Historial completo' : 'Historial de mis resguardos'}</h2>
                <p>{currentView === 'superadmin' && showCompleteHistory ? 'Todas las solicitudes y sus estados del sistema.' : 'Trazabilidad de tus solicitudes de resguardo.'}</p>
              </div>
              {currentView === 'superadmin' && <button className={styles.toggleButton} type="button" onClick={() => setShowCompleteHistory((value) => !value)}>{showCompleteHistory ? 'Ver mis resguardos' : 'Ver historial completo'}</button>}
            </div>
            {historyRequests.length === 0 ? <div className={styles.empty}>No hay resguardos en el historial.</div> : (
              <div className={styles.miniTableWrapper}>
                <table className={styles.miniTable}>
                  <thead><tr><th>Artículo</th><th>Solicitante</th><th>Responsable</th><th>Estado</th><th>Fecha</th></tr></thead>
                    <tbody>{historyRequests.map((request) => <tr key={request.requestId}><td>{request.itemName || 'Artículo no disponible'}</td><td>{request.requesterName || 'Sin solicitante'}</td><td>{request.receiverName || 'Sin responsable'}</td><td><span className={`${styles.badge} ${styles[`status${request.requestStatus}`]}`}>{statusLabels[request.requestStatus]}</span></td><td>{request.createdAt ? new Date(request.createdAt).toLocaleDateString('es-MX') : 'Sin fecha'}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        )}
        {!isAdmin && (
          <section className={styles.historyCard}>
            <div className={styles.historyHeader}>
              <div>
                <h2>Historial de mis resguardos</h2>
                <p>Consulta los artículos aceptados que tienes asignados.</p>
              </div>
            </div>
            {ownCustodyRequests.length === 0 ? <div className={styles.empty}>No hay resguardos en tu historial.</div> : (
              <div className={styles.miniTableWrapper}>
                <table className={styles.miniTable}>
                  <thead><tr><th>Artículo</th><th>Solicitud</th><th>Estado</th><th>Fecha</th></tr></thead>
                  <tbody>{ownCustodyRequests.map((request) => <tr key={request.requestId}><td>{request.itemName || 'Artículo no disponible'}</td><td>{request.name}</td><td><span className={`${styles.badge} ${styles[`status${request.requestStatus}`]}`}>{statusLabels[request.requestStatus]}</span></td><td>{request.createdAt ? new Date(request.createdAt).toLocaleDateString('es-MX') : 'Sin fecha'}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
      </div>

      {isFormOpen && (
        <div className={styles.modalOverlay} onClick={closeForm}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <button className={styles.closeButton} type="button" onClick={closeForm} aria-label="Cerrar formulario">✕</button>
            <h2>Solicitar resguardo</h2>
            <p className={styles.modalSubtitle}>La solicitud se enviará al responsable del artículo seleccionado.</p>
            <form onSubmit={submitRequest}>
              <label htmlFor="requestItem">Artículo *</label>
              <select id="requestItem" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value ? Number(event.target.value) : '')} required>
                <option value="">Selecciona un artículo</option>
                {items.map((item) => <option key={item.itemId} value={item.itemId}>{item.itemName}{item.fk_user_responsible ? ` - ${item.fk_user_responsible.firstName} ${item.fk_user_responsible.lastName}` : ' - Sin responsable'}</option>)}
              </select>
              <label htmlFor="requestName">Motivo *</label>
              <input id="requestName" value={requestName} onChange={(event) => setRequestName(event.target.value)} maxLength={100} placeholder="Ej. Solicitud de resguardo de equipo" required />
              <label htmlFor="requestDescription">Descripción *</label>
              <textarea id="requestDescription" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} placeholder="Describe para qué necesitas el artículo..." required />
              {selectedItem && <p className={styles.receiver}>Se enviará a: {selectedItem.fk_user_responsible ? `${selectedItem.fk_user_responsible.firstName} ${selectedItem.fk_user_responsible.lastName}` : 'sin responsable'}</p>}
              {formMessage && <p className={styles.formMessage}>{formMessage}</p>}
              <div className={styles.formActions}><button className={styles.cancelButton} type="button" onClick={closeForm}>Cancelar</button><button className={styles.primaryButton} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : 'Enviar solicitud'}</button></div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Requests;

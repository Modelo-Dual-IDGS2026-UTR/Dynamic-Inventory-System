import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../utils/auth';
import type { InventoryRequest, RequestStatus } from '../../types';
import { acceptRequest, getUserRequests, rejectRequest } from '../../services/RequestServices';
import styles from './Requests.module.css';

const statusLabels: Record<RequestStatus, string> = { 1: 'Pendiente', 2: 'Aceptada', 3: 'Rechazada' };

export const Requests: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.fk_role === 1 || currentUser?.fk_role === 2;
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError('');
    try {
      setRequests(await getUserRequests(currentUser.userId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las solicitudes.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const changeRequestStatus = async (requestId: number, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') await acceptRequest(requestId);
      else await rejectRequest(requestId);
      await loadRequests();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar la solicitud.');
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div><h1>Solicitudes</h1><p className={styles.subtitle}>{isAdmin ? 'Consulta las solicitudes asociadas a tu usuario.' : 'Consulta el estado de tus solicitudes.'}</p></div>
        <button className={styles.refreshButton} type="button" onClick={() => void loadRequests()}>Actualizar</button>
      </header>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.tableCard}>
        {isLoading ? <div className={styles.message}>Cargando solicitudes...</div> : requests.length === 0 ? <div className={styles.empty}>No hay solicitudes para mostrar.</div> : (
          <table className={styles.table}>
            <thead><tr><th>Solicitud</th><th>Descripción</th><th>Estado</th><th>Creada</th>{isAdmin && <th>Acciones</th>}</tr></thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.requestId}>
                  <td>{request.name}</td>
                  <td>{request.requestDescription}</td>
                  <td><span className={`${styles.badge} ${styles[`status${request.requestStatus}`]}`}>{statusLabels[request.requestStatus]}</span></td>
                  <td>{request.createdAt ? new Date(request.createdAt).toLocaleDateString('es-MX') : 'Sin fecha'}</td>
                  {isAdmin && request.requestStatus === 1 && <td><div className={styles.actions}><button className={styles.actionButton} type="button" onClick={() => void changeRequestStatus(request.requestId, 'accept')}>Aceptar</button><button className={styles.dangerButton} type="button" onClick={() => void changeRequestStatus(request.requestId, 'reject')}>Rechazar</button></div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default Requests;

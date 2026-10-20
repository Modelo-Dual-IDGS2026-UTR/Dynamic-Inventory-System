import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getAdminUsers, updateUserRole, type AdminUser } from '../../services/UserServices';
import { useAuth } from '../../utils/auth';
import styles from './Users.module.css';

const roleLabels: Record<number, string> = {
  1: 'Superadministrador',
  2: 'Administrador',
  3: 'Usuario básico',
};

export const Users: React.FC = () => {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser?.fk_role !== 1) return;
    getAdminUsers().then(setAccounts).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los usuarios.');
    });
  }, [currentUser]);

  if (currentUser?.fk_role !== 1) {
    return <Navigate to="/Dashboard" replace />;
  }

  const changeRole = async (account: AdminUser, role: number) => {
    setMessage('');
    setError('');
    try {
      await updateUserRole(account.userId, role);
      setAccounts((currentAccounts) => currentAccounts.map((item) => item.userId === account.userId ? { ...item, fk_role: role } : item));
      setMessage(`El rol de ${account.firstName} se cambió a ${roleLabels[role]}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el rol.');
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Administración de usuarios</h1>
          <p>Consulta permisos y asigna roles persistentes a los usuarios.</p>
        </div>
          <span className={styles.demoBadge}>Panel real</span>
      </header>
      <div className={styles.warning}>
          Los cambios se guardan en la base de datos. No puedes cambiar tu propio rol.
      </div>
      {message && <div className={styles.success}>{message}</div>}
      {error && <div className={styles.warning}>{error}</div>}
      <div className={styles.tableCard}>
        <table>
          <thead><tr><th>Usuario</th><th>Correo</th><th>Área</th><th>Rol</th><th>Permisos</th></tr></thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.userId}>
                <td><strong>{account.firstName} {account.lastName}</strong></td>
                <td>{account.email}</td>
                <td>{account.area || 'Sin área'}</td>
                <td>
                  <select value={account.fk_role} onChange={(event) => changeRole(account, Number(event.target.value))}>
                    <option value={1}>Superadministrador</option>
                    <option value={2}>Administrador</option>
                    <option value={3}>Usuario básico</option>
                  </select>
                </td>
                <td>
                  {account.permissions.length > 0
                    ? account.permissions.map((permission) => permission.permissionName).join(', ')
                    : 'Sin permisos asignados'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Users;

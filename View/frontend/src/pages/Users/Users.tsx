import React, { useMemo, useState } from 'react';
import { useAuth, type AuthUser } from '../../utils/auth';
import styles from './Users.module.css';

const roleLabels: Record<number, string> = {
  1: 'Superadministrador',
  2: 'Administrador',
  3: 'Usuario básico',
};

const demoAccounts: AuthUser[] = [
  {
    userId: 9001,
    firstName: 'María',
    lastName: 'Vargas',
    email: 'maria.vargas@demo.utr.edu.mx',
    userStatus: true,
    area: 'Mantenimiento',
    fk_role: 3,
  },
  {
    userId: 9002,
    firstName: 'Andrés',
    lastName: 'Gómez',
    email: 'andres.gomez@demo.utr.edu.mx',
    userStatus: true,
    area: 'Tecnologías de la Información',
    fk_role: 3,
  },
];

export const Users: React.FC = () => {
  const { currentUser, setDemoRole } = useAuth();
  const [accounts, setAccounts] = useState<AuthUser[]>(demoAccounts);
  const [message, setMessage] = useState('');
  const allAccounts = useMemo(() => currentUser ? [currentUser, ...accounts.filter((account) => account.userId !== currentUser.userId)] : accounts, [currentUser, accounts]);

  const changeRole = (account: AuthUser, role: number) => {
    setDemoRole(account.userId, role);
    setAccounts((currentAccounts) => currentAccounts.map((item) => item.userId === account.userId ? { ...item, fk_role: role } : item));
    setMessage(`El rol de ${account.firstName} se cambió a ${roleLabels[role]} en modo demostración.`);
  };

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Administración de usuarios</h1>
          <p>Asigna permisos para probar las vistas de usuario y administrador.</p>
        </div>
        <span className={styles.demoBadge}>Modo demostración</span>
      </header>
      <div className={styles.warning}>
        Estos cambios solo se guardan en este navegador. El backend aún no tiene un endpoint para cambiar roles.
      </div>
      {message && <div className={styles.success}>{message}</div>}
      <div className={styles.tableCard}>
        <table>
          <thead><tr><th>Usuario</th><th>Correo</th><th>Área</th><th>Rol</th><th>Permisos</th></tr></thead>
          <tbody>
            {allAccounts.map((account) => (
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
                <td><span className={account.fk_role === 3 ? styles.userBadge : styles.adminBadge}>{roleLabels[account.fk_role]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Users;

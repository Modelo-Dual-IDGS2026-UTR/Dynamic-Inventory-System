import React, { useEffect, useMemo, useRef } from 'react';
import styles from '../../pages/Reports/Reports.module.css';

export interface EmployeeAccountOption {
  userId: number;
  label: string;
}

interface EmployeeAutocompleteProps {
  accounts: EmployeeAccountOption[];
  value: number | null;
  search: string;
  isOpen: boolean;
  isLoading?: boolean;
  onSearchChange: (value: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  onChange: (userId: number | null) => void;
}

export const EmployeeAutocomplete: React.FC<EmployeeAutocompleteProps> = ({
  accounts,
  value,
  search,
  isOpen,
  isLoading = false,
  onSearchChange,
  onOpenChange,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return [...accounts]
      .filter((account) => !query
        || account.label.toLocaleLowerCase().includes(query)
        || String(account.userId).includes(query))
      .sort((first, second) => {
        if (!query) return first.label.localeCompare(second.label);
        const firstStarts = first.label.toLocaleLowerCase().startsWith(query) || String(first.userId).startsWith(query);
        const secondStarts = second.label.toLocaleLowerCase().startsWith(query) || String(second.userId).startsWith(query);
        return Number(secondStarts) - Number(firstStarts) || first.label.localeCompare(second.label);
      });
  }, [accounts, search]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onOpenChange]);

  if (isLoading) {
    return <select className={styles.formInput} disabled><option>Cargando usuarios...</option></select>;
  }

  return (
    <div ref={containerRef} className={styles.autocomplete}>
      <input
        id="modalAssigneeSearch"
        className={styles.formInput}
        type="search"
        placeholder="Buscar por nombre o ID..."
        value={search}
        onFocus={() => onOpenChange(true)}
        onChange={(event) => {
          onSearchChange(event.target.value);
          onOpenChange(true);
        }}
      />
      {isOpen && (
        <div className={styles.autocompleteOptions} role="listbox" aria-label="Empleados">
          <button
            className={styles.autocompleteOption}
            type="button"
            disabled={value === null}
            onClick={() => onChange(null)}
          >
            Sin asignar
          </button>
          {filteredAccounts.map((account) => (
            <button
              className={styles.autocompleteOption}
              type="button"
              key={account.userId}
              role="option"
              aria-selected={value === account.userId}
              disabled={value === account.userId}
              onClick={() => onChange(account.userId)}
            >
              {account.label}
            </button>
          ))}
          {filteredAccounts.length === 0 && (
            <span className={styles.autocompleteEmpty}>No se encontraron empleados.</span>
          )}
        </div>
      )}
      <span className={styles.selectedAssignee}>
        {value === null ? 'Sin asignar' : accounts.find((account) => account.userId === value)?.label || 'Empleado seleccionado'}
      </span>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './DatePicker.module.css';

interface DatePickerProps {
  value: string; // Formato YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string; // Formato YYYY-MM-DD
  max?: string;
  disabledValue?: string;
  className?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function padZero(num: number): string {
  return String(num).padStart(2, '0');
}

function parseYMD(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  disabledValue,
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState(value);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const parsedValue = parseYMD(value);
  const today = new Date();
  const todayYMD = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`;

  // Vista actual del mes/año en el calendario desplegado
  const [viewYear, setViewYear] = useState<number>(() => parsedValue?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => parsedValue?.month ?? today.getMonth());

  // Sincronizar vista si cambia el valor
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    }
  }, [value]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 310; // altura aproximada del popover del calendario

    // Control horizontal: si se desborda por la derecha, alinear hacia la derecha del botón
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = Math.max(10, rect.right - popoverWidth);
    }

    // Control vertical inteligente (auto-flip):
    // Si no cabe abajo de la pantalla pero sí cabe arriba, abrir hacia arriba
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + 4;
    if (spaceBelow < popoverHeight && spaceAbove >= popoverHeight) {
      top = rect.top - popoverHeight - 4;
    } else if (spaceBelow < popoverHeight) {
      // Si tampoco cabe completamente arriba, ajustar para que no se salga de la pantalla
      top = Math.max(10, window.innerHeight - popoverHeight - 10);
    }

    setPopoverPos({
      top,
      left,
    });
  };

  const handleToggle = () => {
    if (!isOpen) {
      setPendingValue(value);
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Cerrar al presionar Escape o reposicionar en scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Generar cuadrícula de días para el mes actual
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 es domingo
  // En semana de Lunes a Domingo: Lunes = 0, Domingo = 6
  const startingOffset = (firstDayOfMonth + 6) % 7;
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handleSelectDay = (day: number) => {
    const formatted = `${viewYear}-${padZero(viewMonth + 1)}-${padZero(day)}`;
    setPendingValue(formatted);
  };

  const handleConfirmSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pendingValue || pendingValue === value) return;
    onChange(pendingValue);
    setIsOpen(false);
  };

  const isDayDisabled = (day: number): boolean => {
    const candidate = `${viewYear}-${padZero(viewMonth + 1)}-${padZero(day)}`;
    const minDate = min ? min.slice(0, 10) : undefined;
    const maxDate = max ? max.slice(0, 10) : undefined;
    if (minDate && candidate < minDate) return true;
    if (maxDate && candidate > maxDate) return true;
    if (disabledValue && candidate === disabledValue.slice(0, 10)) return true;
    return false;
  };

  // Deshabilitar botón "mes anterior" si retroceder llevaría a un mes completamente pasado
  const canGoPrev = (): boolean => {
    if (!min) return true;
    const minDate = min.slice(0, 10);
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const lastDayOfPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    const lastDayStr = `${prevYear}-${padZero(prevMonth + 1)}-${padZero(lastDayOfPrevMonth)}`;
    return lastDayStr >= minDate;
  };

  const isSelected = (day: number): boolean => {
    const pendingDate = parseYMD(pendingValue);
    if (!pendingDate) return false;
    return pendingDate.year === viewYear
      && pendingDate.month === viewMonth
      && pendingDate.day === day;
  };

  const isToday = (day: number): boolean => {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  };

  const formattedDisplay = parsedValue
    ? `${padZero(parsedValue.day)}/${padZero(parsedValue.month + 1)}/${parsedValue.year}`
    : 'Seleccionar fecha';

  const calendarDropdownContent = (
    <>
      <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
      <div
        className={styles.calendarPopover}
        style={{
          top: `${popoverPos.top}px`,
          left: `${popoverPos.left}px`,
        }}
      >
        <div className={styles.calendarHeader}>
          <button
            type="button"
            className={styles.navButton}
            onClick={handlePrevMonth}
            disabled={!canGoPrev()}
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <span className={styles.calendarMonthTitle}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            className={styles.navButton}
            onClick={handleNextMonth}
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>

        <div className={styles.weekdaysGrid}>
          {WEEKDAYS.map((wd) => (
            <span key={wd} className={styles.weekdayHeader}>
              {wd}
            </span>
          ))}
        </div>

        <div className={styles.daysGrid}>
          {Array.from({ length: startingOffset }).map((_, i) => (
            <span key={`empty-${i}`} className={`${styles.dayCell} ${styles.otherMonth}`} />
          ))}

          {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
            const day = i + 1;
            const disabledDay = isDayDisabled(day);
            const selected = isSelected(day);
            const todayMark = isToday(day);

            return (
              <button
                key={day}
                type="button"
                disabled={disabledDay}
                className={`${styles.dayCell} ${selected ? styles.selectedDay : ''} ${todayMark ? styles.todayDay : ''}`}
                onClick={() => handleSelectDay(day)}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className={styles.calendarFooter}>
          <button
            type="button"
            className={styles.todayQuickButton}
            onClick={handleConfirmSelection}
            disabled={!pendingValue || pendingValue === value}
          >
            Seleccionar
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className={`${styles.datePickerWrapper} ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`${styles.datePickerTrigger} ${isOpen ? styles.open : ''}`}
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span>{formattedDisplay}</span>
        <span className={styles.calendarIcon}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(calendarDropdownContent, document.body)}
    </div>
  );
};
export default DatePicker;

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ColorSelect.module.css';

export interface ColorSelectOption<T extends number | string> {
  value: T;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
}

interface ColorSelectProps<T extends number | string> {
  value: T;
  options: ColorSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

export function ColorSelect<T extends number | string>({
  value,
  options,
  onChange,
  disabled = false,
  className,
}: ColorSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; minWidth: number }>({
    top: 0,
    left: 0,
    minWidth: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = options.length * 36 + 16; // aprox altura de opciones

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + 4;
    if (spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight) {
      top = rect.top - dropdownHeight - 4;
    } else if (spaceBelow < dropdownHeight) {
      top = Math.max(10, window.innerHeight - dropdownHeight - 10);
    }

    setDropdownPos({
      top,
      left: rect.left,
      minWidth: rect.width,
    });
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const dropdownContent = (
    <>
      <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
      <div
        className={styles.optionsDropdown}
        role="listbox"
        style={{
          top: `${dropdownPos.top}px`,
          left: `${dropdownPos.left}px`,
          minWidth: `${dropdownPos.minWidth}px`,
        }}
      >
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            className={styles.optionItem}
            style={{
              backgroundColor: option.bgColor,
              color: option.textColor,
            }}
            onClick={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className={`${styles.customSelectWrapper} ${className ?? ''}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={styles.selectTrigger}
        style={{
          backgroundColor: selectedOption ? selectedOption.bgColor : '#ffffff',
          color: selectedOption ? selectedOption.textColor : '#0f172a',
          borderColor: selectedOption?.borderColor || 'transparent',
        }}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption ? selectedOption.label : ''}</span>
        <span className={`${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ''}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
}

export default ColorSelect;


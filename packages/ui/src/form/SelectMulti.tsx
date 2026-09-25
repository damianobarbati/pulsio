import cx from 'clsx-tw';
import * as React from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { ChevronDown } from '../icons.tsx';

export type SelectMultiOption = { value: string; label: string; disabled?: boolean };

type SelectMultiProps = {
  options: SelectMultiOption[];
  name: string;
  onChange?: (value: string[]) => void;
  mode?: 'one' | 'many';
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export const SelectMulti = ({
  className = '',
  label,
  options,
  name,
  onChange,
  mode = 'many',
  placeholder = 'Select options',
  emptyLabel = 'No options found',
  disabled,
}: SelectMultiProps) => {
  const form = useFormContext();
  const { field } = useController({ name, control: form.control, defaultValue: [] });
  const value = (field.value as string[]) || [];
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeItemId, setActiveItemId] = React.useState<string>();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectAllRef = React.useRef<HTMLButtonElement>(null);
  const listboxId = React.useId();
  const labelId = React.useId();
  const selectedOptions = options.filter((option) => value.includes(option.value));
  const selectableOptions = options.filter((option) => !option.disabled);
  const visibleOptions = mode === 'many' ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())) : options;
  const visibleSelectableOptions = visibleOptions.filter((option) => !option.disabled);
  const allSelected = selectableOptions.length > 0 && selectableOptions.every((option) => value.includes(option.value));
  const selectAllId = `${listboxId}-select-all`;

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) {
        setIsOpen(false);
        return;
      }
      if (container.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleOptionClick = (option: SelectMultiOption) => {
    if (option.disabled) return;
    if (mode === 'one') {
      const nextValue = [option.value];
      field.onChange(nextValue);
      onChange?.(nextValue);
      setIsOpen(false);
      return;
    }
    const nextValue = value.includes(option.value) ? value.filter((selectedValue) => selectedValue !== option.value) : [...value, option.value];
    field.onChange(nextValue);
    onChange?.(nextValue);
  };

  const handleSelectAll = () => {
    const nextValue = allSelected ? [] : selectableOptions.map((option) => option.value);
    field.onChange(nextValue);
    onChange?.(nextValue);
  };

  const setFirstActiveOption = (matchingOptions: SelectMultiOption[]) => {
    const firstOption = matchingOptions.find((option) => !option.disabled);
    setActiveItemId(mode === 'many' && selectableOptions.length > 0 ? selectAllId : firstOption ? `${listboxId}-${firstOption.value}` : undefined);
  };

  const handleToggle = () => {
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);
    if (!nextIsOpen) return;
    setQuery('');
    setFirstActiveOption(options);
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    const matchingOptions = options.filter((option) => option.label.toLowerCase().includes(nextQuery.toLowerCase()));
    setQuery(nextQuery);
    setFirstActiveOption(matchingOptions);
  };

  const moveActiveOption = (direction: 1 | -1) => {
    const activeItemIds = [...(mode === 'many' && selectableOptions.length > 0 ? [selectAllId] : []), ...visibleSelectableOptions.map((option) => `${listboxId}-${option.value}`)];
    if (activeItemIds.length === 0) return;
    const currentIndex = activeItemId ? activeItemIds.indexOf(activeItemId) : -1;
    const nextIndex = currentIndex === -1 ? (direction === 1 ? 0 : activeItemIds.length - 1) : (currentIndex + direction + activeItemIds.length) % activeItemIds.length;
    setActiveItemId(activeItemIds[nextIndex]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (!isOpen) {
      if (event.key === 'Enter') {
        const form = containerRef.current?.closest('form');

        if (form) {
          event.preventDefault();
          form.requestSubmit();
        }
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        handleToggle();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActiveOption(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveOption(-1);
      return;
    }
    if (event.key !== ' ') return;
    if (event.target === selectAllRef.current) return;
    if (activeItemId === selectAllId) {
      event.preventDefault();
      handleSelectAll();
      return;
    }
    const activeOption = visibleSelectableOptions.find((option) => `${listboxId}-${option.value}` === activeItemId);
    if (!activeOption) return;
    event.preventDefault();
    handleOptionClick(activeOption);
  };

  const selectedLabel = selectedOptions.length === 0 ? placeholder : mode === 'one' ? selectedOptions[0].label : selectedOptions.map((option) => option.label).join(', ');

  return (
    <div
      className={cx('pulsio-control relative w-full', className)}
      ref={containerRef}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      {label ? (
        <span id={labelId} className="pulsio-control-label">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={label ? undefined : placeholder}
        aria-labelledby={label ? labelId : undefined}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={handleToggle}
        className="pulsio-control-input text-left"
      >
        <span className="flex items-center justify-between gap-3">
          <span className={selectedOptions.length === 0 ? 'text-pulsio-muted' : 'truncate'}>{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-pulsio-muted" />
        </span>
      </button>
      {isOpen ? (
        <div className="absolute z-20 mt-2 w-full rounded-sm border border-pulsio-line bg-white p-2 shadow-pulsio">
          {mode === 'many' ? (
            <>
              <input
                className="pulsio-control-input"
                autoFocus
                value={query}
                onChange={handleQueryChange}
                placeholder="Search options"
                role="combobox"
                aria-controls={listboxId}
                aria-activedescendant={activeItemId}
              />
              {selectableOptions.length > 0 ? (
                <button
                  ref={selectAllRef}
                  id={selectAllId}
                  type="button"
                  tabIndex={-1}
                  onClick={handleSelectAll}
                  className={`mt-2 w-full rounded-sm px-3 py-2 text-left font-semibold text-pulsio-blue text-sm hover:bg-pulsio-nav ${activeItemId === selectAllId ? 'bg-pulsio-nav' : ''}`}
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              ) : null}
            </>
          ) : null}
          <div id={listboxId} role="listbox" aria-multiselectable={mode === 'many'} className="max-h-56 overflow-y-auto">
            {visibleOptions.length === 0 ? <p className="px-3 py-2 text-pulsio-muted text-sm">{emptyLabel}</p> : null}
            {visibleOptions.map((option) => {
              const isSelected = value.includes(option.value);
              const isActive = `${listboxId}-${option.value}` === activeItemId;
              return (
                <button
                  key={option.value}
                  id={`${listboxId}-${option.value}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  tabIndex={-1}
                  onClick={() => handleOptionClick(option)}
                  className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-pulsio-ink text-sm hover:bg-pulsio-nav disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'bg-pulsio-nav' : ''}`}
                >
                  {mode === 'many' ? (
                    <span
                      aria-hidden="true"
                      className={`grid h-4 w-4 place-items-center rounded border text-[10px] leading-none ${isSelected ? 'border-pulsio-blue bg-pulsio-blue text-white' : 'border-pulsio-line'}`}
                    >
                      {isSelected ? '✓' : null}
                    </span>
                  ) : null}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

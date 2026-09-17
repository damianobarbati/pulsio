import * as React from 'react';
import { ChevronDown } from './icons.tsx';

export type MultiSelectOption = { value: string; label: string; disabled?: boolean };

type MultiSelectProps = {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  mode?: 'one' | 'many';
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
};

export const MultiSelect = ({
  options,
  value,
  onChange,
  mode = 'many',
  placeholder = 'Select options',
  emptyLabel = 'No options found',
  disabled,
  className = '',
}: MultiSelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeOptionValue, setActiveOptionValue] = React.useState<string>();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();
  const selectedOptions = options.filter((option) => value.includes(option.value));
  const selectableOptions = options.filter((option) => !option.disabled);
  const visibleOptions = mode === 'many' ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())) : options;
  const visibleSelectableOptions = visibleOptions.filter((option) => !option.disabled);
  const allSelected = selectableOptions.length > 0 && selectableOptions.every((option) => value.includes(option.value));

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

  const handleOptionClick = (option: MultiSelectOption) => {
    if (option.disabled) return;
    if (mode === 'one') {
      onChange([option.value]);
      setIsOpen(false);
      return;
    }
    const nextValue = value.includes(option.value) ? value.filter((selectedValue) => selectedValue !== option.value) : [...value, option.value];
    onChange(nextValue);
  };

  const handleSelectAll = () => onChange(allSelected ? [] : selectableOptions.map((option) => option.value));

  const setFirstActiveOption = (matchingOptions: MultiSelectOption[]) => {
    const firstOption = matchingOptions.find((option) => !option.disabled);
    setActiveOptionValue(firstOption ? firstOption.value : undefined);
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
    if (visibleSelectableOptions.length === 0) return;
    const currentIndex = visibleSelectableOptions.findIndex((option) => option.value === activeOptionValue);
    const nextIndex =
      currentIndex === -1
        ? direction === 1
          ? 0
          : visibleSelectableOptions.length - 1
        : (currentIndex + direction + visibleSelectableOptions.length) % visibleSelectableOptions.length;
    setActiveOptionValue(visibleSelectableOptions[nextIndex].value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (!isOpen) {
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
    if (event.key === 'Tab') {
      setIsOpen(false);
      return;
    }
    if (event.key !== ' ') return;
    const activeOption = visibleSelectableOptions.find((option) => option.value === activeOptionValue);
    if (!activeOption) return;
    event.preventDefault();
    handleOptionClick(activeOption);
  };

  const selectedLabel = selectedOptions.length === 0 ? placeholder : mode === 'one' ? selectedOptions[0].label : selectedOptions.map((option) => option.label).join(', ');

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className={`relative w-full ${className}`}>
      <button
        type="button"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-pulsio-line bg-white px-3 py-2.5 text-left text-pulsio-ink text-sm focus:border-pulsio-blue focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:opacity-60"
      >
        <span className={selectedOptions.length === 0 ? 'text-pulsio-muted' : 'truncate'}>{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-pulsio-muted" />
      </button>
      {isOpen ? (
        <div className="absolute z-20 mt-2 w-full rounded-[var(--radius-md)] border border-pulsio-line bg-white p-2 shadow-pulsio">
          {mode === 'many' ? (
            <>
              <input
                autoFocus
                value={query}
                onChange={handleQueryChange}
                placeholder="Search options"
                role="combobox"
                aria-controls={listboxId}
                aria-activedescendant={activeOptionValue ? `${listboxId}-${activeOptionValue}` : undefined}
                className="w-full rounded-[var(--radius-sm)] border border-pulsio-line px-3 py-2 text-sm outline-none placeholder:text-pulsio-muted focus:border-pulsio-blue focus:ring-2 focus:ring-blue-100"
              />
              {selectableOptions.length > 0 ? (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={handleSelectAll}
                  className="mt-2 w-full rounded-[var(--radius-sm)] px-3 py-2 text-left font-semibold text-pulsio-blue text-sm hover:bg-pulsio-nav"
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
              const isActive = option.value === activeOptionValue;
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
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-pulsio-ink text-sm hover:bg-pulsio-nav disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'bg-pulsio-nav' : ''}`}
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

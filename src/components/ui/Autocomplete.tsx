import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { listarColaboradores } from '@/data/commands';

interface AutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  branchId?: string;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  branchId,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(
    (term: string) => {
      if (term.trim().length < 1) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      listarColaboradores(term, branchId)
        .then((employees) => {
          const names = employees.map((e) => e.name);
          setSuggestions(names);
          setShowDropdown(names.length > 0);
          setHighlightIdx(-1);
        })
        .catch(() => setSuggestions([]));
    },
    [branchId],
  );

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
  };

  const handleSelect = (name: string) => {
    onChange(name);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
          'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
          'placeholder:text-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-agro-500/40 focus:border-agro-500',
          error
            ? 'border-red-300 dark:border-red-700'
            : 'border-slate-200 dark:border-slate-700',
        )}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {suggestions.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => handleSelect(name)}
              className={cn(
                'w-full text-left px-3 py-2 text-sm transition-colors',
                i === highlightIdx
                  ? 'bg-agro-50 dark:bg-agro-950/30 text-agro-700 dark:text-agro-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

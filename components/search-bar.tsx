"use client";

import { useState, useEffect } from "react";

interface SearchBarProps {
  value: string;
  onChange: (keyword: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [localValue, value, onChange]);

  return (
    <div className="relative flex-1 min-w-[300px] max-w-xl">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle">
        search
      </span>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="Search by name, key, or phrase..."
        className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-border-muted rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
      />
    </div>
  );
}

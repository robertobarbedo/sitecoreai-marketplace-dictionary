"use client";

import { Button } from "@/components/ui/button";

interface FindMissingTranslationsButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isActive: boolean;
  missingCount: number;
  onClear: () => void;
}

export function FindMissingTranslationsButton({
  onClick,
  isLoading,
  isActive,
  missingCount,
  onClear,
}: FindMissingTranslationsButtonProps) {
  if (isActive) {
    return (
      <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-lg px-3 py-1.5">
        <span className="material-symbols-outlined text-[18px]">manage_search</span>
        <span className="text-sm font-medium">
          {missingCount} missing {missingCount === 1 ? "translation" : "translations"} found
        </span>
        <button
          onClick={onClear}
          className="ml-1 text-primary/70 hover:text-primary transition-colors"
          aria-label="Clear missing translations filter"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          Finding...
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[18px]">manage_search</span>
          Find Missing Translations
        </>
      )}
    </Button>
  );
}

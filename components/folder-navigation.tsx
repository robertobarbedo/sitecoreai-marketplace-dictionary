"use client";

import { cn } from "@/lib/utils";
import { LETTER_FOLDERS } from "@/src/constants";
import type { DictionaryFolder } from "@/src/types";

interface FolderNavigationProps {
  folders: DictionaryFolder[];
  selectedFolder: string;
  onSelect: (folder: string) => void;
  disabled?: boolean;
}

export function FolderNavigation({
  folders,
  selectedFolder,
  onSelect,
  disabled = false,
}: FolderNavigationProps) {
  const folderNames = new Set(folders.map((f) => f.name));

  const letterFolders = LETTER_FOLDERS;
  const namedFolders = folders.filter(
    (f) => !letterFolders.includes(f.name as (typeof LETTER_FOLDERS)[number])
  );

  return (
    <div className={cn("space-y-3", disabled && "opacity-50 pointer-events-none")}>
      {/* A-Z Row */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        <button
          onClick={() => onSelect("All")}
          className={cn(
            "w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-colors",
            selectedFolder === "All"
              ? "bg-primary text-on-primary"
              : "border border-border-muted bg-white text-on-surface hover:bg-surface-container"
          )}
        >
          All
        </button>
        {letterFolders.map((letter) => {
          const exists = folderNames.has(letter);
          return (
            <button
              key={letter}
              onClick={() => exists && onSelect(letter)}
              disabled={!exists}
              className={cn(
                "h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-colors",
                letter === "0-9" ? "px-2.5" : "w-9",
                selectedFolder === letter
                  ? "bg-primary text-on-primary"
                  : exists
                    ? "border border-border-muted bg-white text-on-surface hover:bg-surface-container"
                    : "border border-border-muted bg-surface-grey text-text-subtle/40 cursor-not-allowed"
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Named Folders Row */}
      {namedFolders.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-text-subtle uppercase tracking-widest">
            Other Folders:
          </span>
          <div className="flex flex-wrap justify-center gap-3">
          {namedFolders.map((folder) => (
            <button
              key={folder.itemId}
              onClick={() => onSelect(folder.name)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors",
                selectedFolder === folder.name
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-white border border-border-muted hover:bg-surface-container text-on-surface-variant"
              )}
            >
              <span className="material-symbols-outlined text-[18px]">folder</span>
              {folder.name}
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

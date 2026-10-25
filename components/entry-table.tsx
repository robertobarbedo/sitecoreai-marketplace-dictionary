"use client";

import type { DictionaryEntry } from "@/src/types";
import { Button } from "@/components/ui/button";

interface EntryTableProps {
  entries: DictionaryEntry[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  disableDeletion: boolean;
  baseLanguage: string;
  displayLanguage: string;
  onEdit: (entry: DictionaryEntry) => void;
  onDelete: (entry: DictionaryEntry) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function getEntryFolderPath(fullPath: string): string {
  const match = fullPath.match(/\/dictionary(\/.*)/i);
  if (!match) return "";
  const segments = match[1].split("/").filter(Boolean);
  segments.pop(); // remove entry name (last segment)
  return segments.length > 0 ? "/" + segments.join("/") : "";
}

export function EntryTable({
  entries,
  totalCount,
  pageIndex,
  pageSize,
  isLoading,
  disableDeletion,
  baseLanguage,
  displayLanguage,
  onEdit,
  onDelete,
  onPageChange,
  onPageSizeChange,
}: EntryTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalCount);
  const sameLanguage = baseLanguage === displayLanguage;
  const colCount = disableDeletion ? 5 : 6;

  return (
    <div className="bg-white border border-border-muted rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-surface-grey border-b border-border-muted">
              <th className="px-4 py-4 font-mono text-on-surface-variant uppercase tracking-wider text-xs font-bold w-[196px]">
                Name
              </th>
              <th className="px-4 py-4 font-mono text-on-surface-variant uppercase tracking-wider text-xs font-bold w-[224px]">
                Key
              </th>
              <th className="px-4 py-4 font-mono text-on-surface-variant uppercase tracking-wider text-xs font-bold">
                Phrase
              </th>
              <th className="px-4 py-4 font-mono text-on-surface-variant uppercase tracking-wider text-xs font-bold w-[90px]">
                Status
              </th>
              <th className="px-2 py-4 font-mono text-on-surface-variant text-center uppercase tracking-wider text-xs font-bold w-[52px]">
                Edit
              </th>
              {!disableDeletion && (
                <th className="px-2 py-4 font-mono text-on-surface-variant text-center uppercase tracking-wider text-xs font-bold w-[52px]">
                  Del
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-muted">
            {isLoading ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-12 text-center text-text-subtle"
                >
                  <span className="material-symbols-outlined animate-spin text-primary text-[24px]">
                    progress_activity
                  </span>
                  <p className="mt-2">Loading entries...</p>
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-12 text-center text-text-subtle"
                >
                  No dictionary entries found.
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => (
                <tr
                  key={`${entry.itemId}-${index}`}
                  className="hover:bg-surface-container-low transition-colors group"
                >
                  <td
                    className="px-4 py-4 cursor-pointer"
                    onClick={() => onEdit(entry)}
                  >
                    <span className="font-bold text-on-surface group-hover:text-primary transition-colors text-sm truncate block">
                      {entry.name}
                    </span>
                    {getEntryFolderPath(entry.path) && (
                      <span className="text-text-subtle text-xs truncate block mt-0.5">
                        {getEntryFolderPath(entry.path)}
                      </span>
                    )}
                  </td>
                  <td
                    className="px-4 py-4 cursor-pointer"
                    onClick={() => onEdit(entry)}
                  >
                    <code className="font-mono text-xs text-primary bg-primary-fixed px-1.5 py-0.5 rounded inline-block max-w-full truncate">
                      {entry.key}
                    </code>
                  </td>
                  <td
                    className="px-4 py-4 cursor-pointer"
                    onClick={() => onEdit(entry)}
                  >
                    <PhraseCell
                      entry={entry}
                      baseLanguage={baseLanguage}
                      displayLanguage={displayLanguage}
                      sameLanguage={sameLanguage}
                    />
                  </td>
                  <td className="px-4 py-4">
                    {entry.status === "ok" ? (
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-primary font-bold text-xs uppercase tracking-tighter">
                        Ok
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-error-container text-error font-bold text-xs uppercase tracking-tighter">
                        Missing
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-4 text-center">
                    <button
                      onClick={() => onEdit(entry)}
                      className="p-1.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                  </td>
                  {!disableDeletion && (
                    <td className="px-2 py-4 text-center">
                      <button
                        onClick={() => onDelete(entry)}
                        className="p-1.5 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 bg-surface-grey border-t border-border-muted flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-text-subtle text-sm">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-transparent font-bold text-on-surface cursor-pointer text-sm"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-subtle text-sm">
            {totalCount > 0
              ? `${startItem}-${endItem} of ${totalCount.toLocaleString()}`
              : "0 results"}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={pageIndex === 0}
              onClick={() => onPageChange(0)}
            >
              <span className="material-symbols-outlined">first_page</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={pageIndex === 0}
              onClick={() => onPageChange(pageIndex - 1)}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={pageIndex >= totalPages - 1}
              onClick={() => onPageChange(pageIndex + 1)}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={pageIndex >= totalPages - 1}
              onClick={() => onPageChange(totalPages - 1)}
            >
              <span className="material-symbols-outlined">last_page</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhraseCell({
  entry,
  baseLanguage,
  displayLanguage,
  sameLanguage,
}: {
  entry: DictionaryEntry;
  baseLanguage: string;
  displayLanguage: string;
  sameLanguage: boolean;
}) {
  if (sameLanguage) {
    return (
      <div className="flex items-baseline gap-1.5 text-sm">
        <span className="font-mono text-[11px] text-on-surface-variant bg-surface-grey px-1.5 py-0.5 rounded shrink-0">
          {baseLanguage}
        </span>
        <span className="text-text-subtle truncate">
          {entry.phrase || entry.basePhrase || (
            <span className="italic text-text-subtle/50">Empty</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[11px] text-on-surface-variant bg-surface-grey px-1.5 py-0.5 rounded shrink-0">
          {baseLanguage}
        </span>
        <span className="text-text-subtle truncate">
          {entry.basePhrase || (
            <span className="italic text-text-subtle/50">Empty</span>
          )}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[11px] text-on-surface-variant bg-surface-grey px-1.5 py-0.5 rounded shrink-0">
          {displayLanguage}
        </span>
        <span className="text-text-subtle truncate">
          {entry.phrase || (
            <span className="italic text-text-subtle/50">Empty</span>
          )}
        </span>
      </div>
    </div>
  );
}

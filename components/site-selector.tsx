"use client";

import { mdiWeb } from "@mdi/js";
import { Icon } from "@/lib/icon";
import type { Site } from "@/src/types";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface SiteSelectorProps {
  sites: Site[];
  selectedSite: Site | null;
  onSelect: (site: Site) => void;
  onSettingsClick: () => void;
  baseLanguage?: string;
}

export function SiteSelector({ sites, selectedSite, onSelect, onSettingsClick, baseLanguage }: SiteSelectorProps) {
  return (
    <div className="flex items-center bg-white border border-border-muted rounded-xl overflow-hidden">
      <Select
        value={selectedSite?.name ?? ""}
        onValueChange={(name) => {
          const site = sites.find((s) => s.name === name);
          if (site) onSelect(site);
        }}
      >
        <SelectTrigger className="min-w-[240px] px-4 py-2.5 border-0 rounded-none focus:ring-0 focus:ring-offset-0">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded flex items-center justify-center text-primary">
              <Icon path={mdiWeb} size={0.85} />
            </div>
            <div className="text-left">
              <SelectValue placeholder="Select site">
                <span className="font-bold text-on-surface text-sm">
                  {selectedSite?.name ?? "Select site"}
                </span>
              </SelectValue>
              {baseLanguage && (
                <p className="text-[10px] text-text-subtle leading-none mt-0.5">
                  <span className="uppercase tracking-wider">Base Language</span>: <span className="font-mono font-bold normal-case">{baseLanguage}</span>
                </p>
              )}
            </div>
          </div>
        </SelectTrigger>
        <SelectContent>
          {sites.map((site) => (
            <SelectItem key={site.name} value={site.name}>
              {site.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-8 bg-border-muted shrink-0" />

      <button
        type="button"
        onClick={onSettingsClick}
        className="flex items-center px-3 py-2.5 text-text-subtle hover:text-on-surface hover:bg-surface-bright transition-colors"
        title="Site Settings"
      >
        <span className="material-symbols-outlined text-[20px]">settings</span>
      </button>
    </div>
  );
}

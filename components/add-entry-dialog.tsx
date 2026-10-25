"use client";

import { useState, useEffect } from "react";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { DictionaryEntry, DictionaryFolder, DictionarySettings } from "@/src/types";
import { DICTIONARY_FOLDER_TEMPLATE_ID, DICTIONARY_ENTRY_TEMPLATE_ID } from "@/src/constants";
import { createItem } from "@/src/utils/sitecore-graphql";
import { deriveKey } from "@/src/utils/key-rules";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientSDK;
  sitecoreContextId: string;
  folders: DictionaryFolder[];
  dictionaryRootId: string;
  settings: DictionarySettings;
  onEntryAdded: (entry: DictionaryEntry) => void;
}

export function AddEntryDialog({
  open,
  onOpenChange,
  client,
  sitecoreContextId,
  folders,
  dictionaryRootId,
  settings,
  onEntryAdded,
}: AddEntryDialogProps) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [suggestedNewFolder, setSuggestedNewFolder] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const folderNames = new Set(folders.map((f) => f.name));

  const ITEM_NAME_REGEX = /^[\w\*\$][\w\s\-\$]*(\(\d{1,}\)){0,1}$/;
  const isNameValid = !name.trim() || ITEM_NAME_REGEX.test(name.trim());

  useEffect(() => {
    if (!name || settings.disableAutoFormat) return;

    const derived = deriveKey(name, settings.keyRule);
    setKey(derived);

    const firstLetter = name.trim().charAt(0).toUpperCase();
    if (firstLetter) {
      const matchingFolder = folders.find(
        (f) => f.name.toUpperCase() === firstLetter
      );
      if (matchingFolder) {
        setSelectedFolderId(matchingFolder.itemId);
        setSuggestedNewFolder("");
      } else {
        setSelectedFolderId("");
        setSuggestedNewFolder(firstLetter);
      }
    }
  }, [name, settings.keyRule, settings.disableAutoFormat, folders]);

  const handleSubmit = async () => {
    if (!name.trim() || !key.trim() || !ITEM_NAME_REGEX.test(name.trim())) return;

    setIsSaving(true);
    try {
      let parentId = selectedFolderId || dictionaryRootId;

      // Create folder if it doesn't exist
      if (suggestedNewFolder && !selectedFolderId) {
        const newFolder = await createItem(
          client,
          sitecoreContextId,
          dictionaryRootId,
          DICTIONARY_FOLDER_TEMPLATE_ID,
          suggestedNewFolder,
          settings.baseLanguage
        );
        if (newFolder) {
          parentId = newFolder.itemId;
        }
      }

      const createdItem = await createItem(
        client,
        sitecoreContextId,
        parentId,
        DICTIONARY_ENTRY_TEMPLATE_ID,
        name.trim(),
        settings.baseLanguage,
        [
          { name: "Key", value: key.trim() },
        ]
      );

      setName("");
      setKey("");
      setSelectedFolderId("");
      setSuggestedNewFolder("");

      if (createdItem) {
        const entry: DictionaryEntry = {
          itemId: createdItem.itemId,
          name: createdItem.name,
          path: createdItem.path,
          key: key.trim(),
          phrase: "",
          basePhrase: "",
          status: "ok",
        };
        onEntryAdded(entry);
      }
    } catch (e) {
      console.error("Error creating entry:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Dictionary Entry</DialogTitle>
          <DialogDescription>
            Create a new dictionary entry. The key will be auto-derived from the
            name based on your key rule settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name and Key */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-text-subtle block mb-1.5">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Welcome Message"
                className={cn(!isNameValid && "border-destructive focus-visible:ring-destructive")}
              />
              {!isNameValid && (
                <p className="text-xs text-destructive mt-1">
                  Invalid item name format.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-text-subtle block mb-1.5">
                Key
              </label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="welcomeMessage"
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Folder Selection */}
          <div>
            <label className="text-xs font-bold text-text-subtle block mb-2">
              Folder
            </label>
            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-2 border border-border-muted rounded-lg bg-surface-container-low">
              {folders.map((folder) => (
                <button
                  key={folder.itemId}
                  type="button"
                  onClick={() => {
                    setSelectedFolderId(folder.itemId);
                    setSuggestedNewFolder("");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer",
                    selectedFolderId === folder.itemId
                      ? "bg-primary text-on-primary"
                      : "bg-white border border-border-muted text-on-surface-variant hover:bg-surface-container"
                  )}
                >
                  {folder.name}
                </button>
              ))}
              {suggestedNewFolder && !folderNames.has(suggestedNewFolder) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFolderId("");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold border-2 border-dashed transition-colors cursor-pointer",
                    !selectedFolderId
                      ? "border-primary text-primary bg-primary-fixed"
                      : "border-border-muted text-text-subtle hover:border-primary"
                  )}
                >
                  + {suggestedNewFolder}
                </button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !key.trim() || !isNameValid || isSaving}>
            {isSaving ? "Creating..." : "Create Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

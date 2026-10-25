"use client";

import { useState } from "react";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { DictionaryEntry } from "@/src/types";
import { deleteItem } from "@/src/utils/sitecore-graphql";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientSDK;
  sitecoreContextId: string;
  entry: DictionaryEntry;
  onDeleted: () => void;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  client,
  sitecoreContextId,
  entry,
  onDeleted,
}: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteItem(client, sitecoreContextId, entry.path, false);
      if (success) {
        onDeleted();
      }
    } catch (e) {
      console.error("Error deleting entry:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Entry</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{entry.name}&quot;? This action
            will move the item to the recycle bin.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-error-container/30 border border-error-container rounded-lg p-3 my-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-error text-[18px]">
              warning
            </span>
            <span className="text-on-error-container font-medium">
              This will remove the entry in all languages.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

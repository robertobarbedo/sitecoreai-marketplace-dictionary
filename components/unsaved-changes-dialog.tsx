"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDiscard: () => void;
  isSaving?: boolean;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSave,
  onDiscard,
  isSaving = false,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes. Do you want to save them before leaving?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-amber-700 text-[18px]">
              warning
            </span>
            <span className="text-amber-700 font-medium">
              If you leave without saving, your changes will be lost.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            Discard Changes
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {isSaving ? "Saving..." : "Save & Exit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

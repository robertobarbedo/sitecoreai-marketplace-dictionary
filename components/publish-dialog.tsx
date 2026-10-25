"use client";

import { useState } from "react";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { publishDictionary } from "@/src/utils/sitecore-graphql";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientSDK;
  sitecoreContextId: string;
  dictionaryRootPath: string;
  /** Every language the dictionary is edited in; all of them are published. */
  languages: string[];
  showToast: (title: string, description: string, options?: { variant?: "default" | "success" | "error" | "warning"; link?: string; duration?: number }) => void;
}

export function PublishDialog({
  open,
  onOpenChange,
  client,
  sitecoreContextId,
  dictionaryRootPath,
  languages,
  showToast,
}: PublishDialogProps) {
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publishDictionary(client, sitecoreContextId, dictionaryRootPath, languages);
      onOpenChange(false);
      const origin =
        (typeof window !== "undefined" && (window.opener as Window | null)?.location?.origin) ||
        window.location.origin;
      showToast(
        "Publishing started",
        "Your dictionary is being published.",
        {
          variant: "success",
          link: `${origin}/settings/publishing-jobs`,
          duration: 10000,
        }
      );
    } catch (e) {
      console.error("Error publishing:", e);
      showToast("Error", "Failed to start publishing. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Dictionary</DialogTitle>
          <DialogDescription>
            Publishing will push all dictionary changes to the live site. This
            process can take several minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-surface-container-low border border-border-muted rounded-lg p-4 my-2">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
              info
            </span>
            <div className="text-sm text-on-surface-variant">
              <p className="font-bold mb-1">Recommendation</p>
              <p>
                Make all your changes first, then publish once. Publishing takes
                time and it&apos;s more efficient to batch your edits.
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-text-subtle space-y-1 mt-2">
          <p>
            <strong>Item:</strong> {dictionaryRootPath}
          </p>
          <p>
            <strong>Languages:</strong> {languages.join(", ")}
          </p>
          <p>
            <strong>Mode:</strong> SMART (only changed items)
          </p>
          <p>
            <strong>Sub-items:</strong> Yes
          </p>
          <p>
            <strong>Related items:</strong> No
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing}>
            <span className="material-symbols-outlined text-[18px]">publish</span>
            {isPublishing ? "Publishing..." : "Confirm Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

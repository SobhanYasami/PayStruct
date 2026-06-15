"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (comment?: string) => void;
  title: string;
  description?: string;
  requireComment?: boolean;
  confirmLabel?: string;
  confirmClassName?: string;
  isPending?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  requireComment = false,
  confirmLabel = "تأیید",
  confirmClassName = "bg-primary text-primary-foreground hover:bg-primary/90",
  isPending = false,
}: Props) {
  const [comment, setComment] = useState("");

  const handleConfirm = () => {
    if (requireComment && !comment.trim()) return;
    onConfirm(requireComment ? comment.trim() : undefined);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 data-[state=open]:animate-overlay-enter data-[state=closed]:animate-overlay-exit" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl focus:outline-none data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out">
          <div className="p-6">
            <div className="flex gap-4 items-start">
              <div className="shrink-0 w-10 h-10 rounded-full bg-status-rejected/10 flex items-center justify-center mt-0.5">
                <AlertTriangle size={18} className="text-status-rejected" />
              </div>
              <div className="flex-1 min-w-0">
                <Dialog.Title className="text-base font-semibold text-foreground leading-tight">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {description}
                  </Dialog.Description>
                )}
              </div>
            </div>

            {requireComment && (
              <textarea
                className="mt-4 w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-muted/30 placeholder:text-muted-foreground/60"
                rows={3}
                placeholder="توضیحات (الزامی)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            )}

            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending || (requireComment && !comment.trim())}
                className={`px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors cursor-pointer ${confirmClassName}`}
              >
                {isPending ? "در حال انجام..." : confirmLabel}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

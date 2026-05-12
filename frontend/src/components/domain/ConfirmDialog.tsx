"use client";

import * as Dialog from "@radix-ui/react-dialog";
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
  confirmClassName = "bg-primary text-primary-foreground",
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
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-base font-semibold text-foreground mb-2">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="text-sm text-muted-foreground mb-4">{description}</Dialog.Description>
          )}
          {requireComment && (
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              rows={3}
              placeholder="توضیحات (الزامی)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          )}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition"
            >
              انصراف
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPending || (requireComment && !comment.trim())}
              className={`px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50 transition ${confirmClassName}`}
            >
              {isPending ? "در حال انجام..." : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

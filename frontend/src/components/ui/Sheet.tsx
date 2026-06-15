"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  description?: string;
}

export function Sheet({ open, onClose, title, description, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 data-[state=open]:animate-overlay-enter data-[state=closed]:animate-overlay-exit" />
        <Dialog.Content className="fixed top-0 right-0 z-50 h-full w-full max-w-110 bg-white shadow-2xl flex flex-col data-[state=open]:animate-sheet-enter data-[state=closed]:animate-sheet-exit focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
            <div>
              <Dialog.Title className="text-base font-semibold text-foreground">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="بستن"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

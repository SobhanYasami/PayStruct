"use client";

import dynamic from "next/dynamic";
import { X, ExternalLink } from "lucide-react";
import type { Attachment } from "@/lib/api/contracts";

const PDFViewer = dynamic(() => import("./PDFViewer"), { ssr: false });

interface DocumentViewerProps {
  attachment: Attachment | null;
  onClose: () => void;
}

export default function DocumentViewer({ attachment, onClose }: DocumentViewerProps) {
  if (!attachment) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="truncate text-sm font-medium">{attachment.file_name}</span>
          <div className="flex items-center gap-2">
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="باز کردن در تب جدید"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {attachment.mime_type === "application/pdf" ? (
            <PDFViewer url={attachment.url} />
          ) : attachment.mime_type.startsWith("image/") ? (
            <img
              src={attachment.url}
              alt={attachment.file_name}
              className="mx-auto max-w-full rounded"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
              <p>پیش‌نمایش در دسترس نیست</p>
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                دانلود فایل
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

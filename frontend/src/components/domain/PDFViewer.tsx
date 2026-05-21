"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
const WORKER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
const READY_EVENT = "__pdfjs_ready";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __pdfjsLib: any;
  }
}

// Injects a <script type="module"> that imports pdf.js from CDN and fires
// a CustomEvent when ready. This keeps the CDN URL out of Turbopack's module
// graph entirely — static analysis never sees the import.
function injectPdfJs(): Promise<void> {
  if (window.__pdfjsLib) return Promise.resolve();

  return new Promise((resolve, reject) => {
    window.addEventListener(READY_EVENT, () => resolve(), { once: true });

    const s = document.createElement("script");
    s.type = "module";
    s.textContent = [
      `import * as pdfjs from "${PDFJS_CDN}";`,
      `pdfjs.GlobalWorkerOptions.workerSrc = "${WORKER_CDN}";`,
      `window.__pdfjsLib = pdfjs;`,
      `window.dispatchEvent(new CustomEvent("${READY_EVENT}"));`,
    ].join("\n");
    s.onerror = () => reject(new Error("pdf.js CDN load failed"));
    document.head.appendChild(s);
  });
}

interface PDFViewerProps {
  url: string;
}

export default function PDFViewer({ url }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await injectPdfJs();
        if (cancelled) return;
        const pdf = await window.__pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setPage(1);
        setLoading(false);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (!pdfRef.current || loading || !canvasRef.current) return;
    let cancelled = false;
    const render = async () => {
      try {
        const pdfPage = await pdfRef.current.getPage(page);
        if (cancelled || !canvasRef.current) return;
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await pdfPage.render({
          canvasContext: canvas.getContext("2d")!,
          viewport,
        }).promise;
      } catch {}
    };
    render();
    return () => { cancelled = true; };
  }, [page, loading]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
        <p>خطا در بارگذاری فایل PDF</p>
        <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">
          دانلود مستقیم
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} className="max-w-full rounded border shadow" />
      {numPages > 1 && (
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded p-1 hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-muted-foreground">
            {page} / {numPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={page === numPages}
            className="rounded p-1 hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

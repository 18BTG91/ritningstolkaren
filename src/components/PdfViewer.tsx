"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { BoundingBox } from "@/lib/types";

interface Props {
  url: string;
  highlights?: BoundingBox[];
}

export default function PdfViewer({ url, highlights = [] }: Props) {
  const [numPages, setNumPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    setCurrentPage(1);
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const loadingTask = pdfjsLib.getDocument(url);
        const doc = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // Render current page
  const renderPage = useCallback(async () => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!doc || !canvas || !container) return;

    try {
      const page = await doc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const containerW = container.clientWidth;
      const containerH = container.clientHeight;

      // Fit to container
      const fitScale = Math.min(containerW / viewport.width, containerH / viewport.height, 2) * scale;
      const fitViewport = page.getViewport({ scale: fitScale });

      canvas.width = fitViewport.width;
      canvas.height = fitViewport.height;
      setPageSize({ w: fitViewport.width, h: fitViewport.height });

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport: fitViewport }).promise;
    } catch (err) {
      console.error("Failed to render page:", err);
    }
  }, [currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage, numPages]);

  // Re-render on resize
  useEffect(() => {
    const observer = new ResizeObserver(() => renderPage());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [renderPage]);

  const goPage = (d: number) => setCurrentPage((p) => Math.max(1, Math.min(numPages, p + d)));
  const changeZoom = (d: number) => setScale((s) => Math.max(0.5, Math.min(3, +(s + d).toFixed(2))));

  // Filter highlights for current page
  const pageHighlights = highlights.filter((h) => h.page === currentPage);

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <button onClick={() => goPage(-1)} disabled={currentPage <= 1} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium min-w-[60px] text-center">
            {currentPage} / {numPages}
          </span>
          <button onClick={() => goPage(1)} disabled={currentPage >= numPages} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => changeZoom(-0.25)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => changeZoom(0.25)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button onClick={() => setScale(1)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1" title="Återställ zoom">
            <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* Canvas + overlay */}
      <div ref={containerRef} className="flex-1 bg-slate-200 dark:bg-slate-900 overflow-auto flex items-start justify-center p-4">
        <div className="relative inline-block">
          <canvas ref={canvasRef} className="block shadow-xl rounded" />
          {/* Highlight overlay */}
          <div ref={overlayRef} className="absolute inset-0 pointer-events-none">
            {pageHighlights.map((h, idx) => (
              <div
                key={idx}
                className="absolute border-2 border-red-500 bg-red-500/20 rounded-sm animate-pulse"
                style={{
                  left: `${(h.x / 1000) * 100}%`,
                  top: `${(h.y / 1000) * 100}%`,
                  width: `${(h.w / 1000) * 100}%`,
                  height: `${(h.h / 1000) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

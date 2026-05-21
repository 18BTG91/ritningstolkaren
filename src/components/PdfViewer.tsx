"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface Props {
  url: string;
}

export default function PdfViewer({ url }: Props) {
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Use PDF.js viewer URL params for page navigation
  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("zoom", String(zoom));
    return `${url}#${params.toString()}`;
  };

  // Try to detect page count from PDF (basic approach)
  useEffect(() => {
    setCurrentPage(1);
    // Attempt to count pages using fetch + basic PDF parsing
    (async () => {
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const text = new TextDecoder("latin1").decode(bytes);
        // Count /Type /Page occurrences (rough estimate)
        const matches = text.match(/\/Type\s*\/Page[^s]/g);
        if (matches && matches.length > 0) {
          setNumPages(matches.length);
        }
      } catch {
        setNumPages(1);
      }
    })();
  }, [url]);

  const goPage = (delta: number) => {
    setCurrentPage((p) => Math.max(1, Math.min(numPages, p + delta)));
  };

  const changeZoom = (delta: number) => {
    setZoom((z) => Math.max(50, Math.min(300, z + delta)));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goPage(-1)}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium min-w-[60px] text-center">
            {currentPage} / {numPages}
          </span>
          <button
            onClick={() => goPage(1)}
            disabled={currentPage >= numPages}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={() => changeZoom(-25)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium min-w-[40px] text-center">{zoom}%</span>
          <button onClick={() => changeZoom(25)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1"
            title="Återställ zoom"
          >
            <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* PDF display */}
      <div className="flex-1 bg-slate-200 dark:bg-slate-900 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={buildUrl()}
          className="w-full h-full border-0"
          title="PDF-ritning"
        />
      </div>
    </div>
  );
}

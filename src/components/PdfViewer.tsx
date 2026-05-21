"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Loader2, Hand, MousePointer } from "lucide-react";
import type { BoundingBox } from "@/lib/types";

export interface Highlight {
  bbox: BoundingBox;
  color: string;
}

interface Props {
  data: ArrayBuffer;
  highlights?: Highlight[];
}

export default function PdfViewer({ data, highlights = [] }: Props) {
  const [numPages, setNumPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null);
  const renderIdRef = useRef(0);

  // Pan/drag state
  const isPanningRef = useRef(false);
  const [panMode, setPanMode] = useState(true);
  const panStart = useRef({ x: 0, y: 0 });
  const scrollStart = useRef({ x: 0, y: 0 });

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    setCurrentPage(1);
    setStatus("loading");
    pdfDocRef.current = null;

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const copy = new Uint8Array(data).slice(0);
        const doc = await pdfjsLib.getDocument({ data: copy }).promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setStatus("ready");
      } catch (err) {
        console.error("PDF load error:", err);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [data]);

  // Render page
  useEffect(() => {
    if (status !== "ready") return;
    const id = ++renderIdRef.current;

    const doRender = async () => {
      const doc = pdfDocRef.current;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!doc || !canvas || !container) return;

      try {
        const page = await doc.getPage(currentPage);
        if (id !== renderIdRef.current) return;

        const baseVp = page.getViewport({ scale: 1 });
        const cw = container.clientWidth - 32;
        const ch = container.clientHeight - 32;
        if (cw <= 0 || ch <= 0) return;

        const fitRatio = Math.min(cw / baseVp.width, ch / baseVp.height);
        const vp = page.getViewport({ scale: fitRatio * scale });

        canvas.width = vp.width;
        canvas.height = vp.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, vp.width, vp.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
      } catch (err) {
        console.error("Render error:", err);
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => doRender());
    });
  }, [status, currentPage, scale]);

  // Re-render on resize
  useEffect(() => {
    if (status !== "ready") return;
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const id = ++renderIdRef.current;
        const doc = pdfDocRef.current;
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!doc || !canvas || !container) return;

        (async () => {
          const page = await doc.getPage(currentPage);
          if (id !== renderIdRef.current) return;
          const baseVp = page.getViewport({ scale: 1 });
          const cw = container.clientWidth - 32;
          const ch = container.clientHeight - 32;
          if (cw <= 0 || ch <= 0) return;
          const fitRatio = Math.min(cw / baseVp.width, ch / baseVp.height);
          const vp = page.getViewport({ scale: fitRatio * scale });
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
        })();
      }, 150);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [status, currentPage, scale]);

  // Pan handlers — use refs to avoid re-renders during drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panMode) return;
    e.preventDefault();
    isPanningRef.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    const c = containerRef.current;
    if (c) {
      scrollStart.current = { x: c.scrollLeft, y: c.scrollTop };
      c.style.cursor = "grabbing";
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current) return;
    const c = containerRef.current;
    if (!c) return;
    c.scrollLeft = scrollStart.current.x - (e.clientX - panStart.current.x);
    c.scrollTop = scrollStart.current.y - (e.clientY - panStart.current.y);
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    const c = containerRef.current;
    if (c) c.style.cursor = panMode ? "grab" : "";
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const d = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => Math.max(0.5, Math.min(3, +(s + d).toFixed(2))));
    }
  };

  const goPage = (d: number) => setCurrentPage((p) => Math.max(1, Math.min(numPages, p + d)));
  const changeZoom = (d: number) => setScale((s) => Math.max(0.5, Math.min(3, +(s + d).toFixed(2))));
  const pageHighlights = highlights.filter((h) => h.bbox.page === currentPage);

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
          {/* Pan/select toggle */}
          <button
            onClick={() => setPanMode(!panMode)}
            className={`p-1 rounded transition-colors ${panMode ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600" : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
            title={panMode ? "Dragläge (klicka för att stänga av)" : "Aktivera dragläge"}
          >
            {panMode ? <Hand className="w-4 h-4" /> : <MousePointer className="w-4 h-4" />}
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
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
      <div
        ref={containerRef}
        className={`flex-1 min-h-0 bg-slate-200 dark:bg-slate-900 overflow-auto ${panMode ? "cursor-grab" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Laddar PDF...</span>
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center justify-center h-full text-red-400 text-sm">Kunde inte ladda PDF</div>
        )}
        {status === "ready" && (
          <div className="relative inline-block select-none" style={{ margin: "16px auto", display: "block", width: "fit-content" }}>
            <canvas ref={canvasRef} className="block shadow-xl rounded" />
            {/* Highlight overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 1000" preserveAspectRatio="none">
              {pageHighlights.map((h, idx) => (
                <line
                  key={idx}
                  x1={h.bbox.x} y1={h.bbox.y + h.bbox.h / 2}
                  x2={h.bbox.x + h.bbox.w} y2={h.bbox.y + h.bbox.h / 2}
                  stroke={h.color} strokeWidth={4} strokeOpacity={0.85}
                  strokeLinecap="round"
                >
                  <animate attributeName="stroke-opacity" values="0.85;0.4;0.85" dur="1.5s" repeatCount="indefinite" />
                </line>
              ))}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

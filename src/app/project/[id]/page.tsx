"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  ArrowLeft, Upload, FileText, Loader2, Trash2, Zap,
  Cable, BarChart3, MessageSquare, Download, ChevronDown, ChevronUp,
  Search, Package, Lightbulb, Wrench, ShieldAlert, Radio, Plus,
} from "lucide-react";
import {
  getProject, saveProject, getDrawingsByProject, saveDrawing,
  deleteDrawing, saveFile, getFile,
  type ProjectRecord, type DrawingRecord,
} from "@/lib/db";
import type { AnalysisResult, CostLineItem, ChatMessage, BoundingBox } from "@/lib/types";
import PdfViewer from "@/components/PdfViewer";
import ProjectStats from "@/components/ProjectStats";
import ProjectSummary from "@/components/ProjectSummary";

function fmt(n: number) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const catIcons: Record<string, React.ReactNode> = {
  "Belysning": <Lightbulb className="w-3.5 h-3.5" />, "Uttag": <Zap className="w-3.5 h-3.5" />,
  "Strömställare": <Wrench className="w-3.5 h-3.5" />, "Kabel": <Cable className="w-3.5 h-3.5" />,
  "Central": <Package className="w-3.5 h-3.5" />, "Förläggning": <Package className="w-3.5 h-3.5" />,
  "Larm": <ShieldAlert className="w-3.5 h-3.5" />, "Kommunikation": <Radio className="w-3.5 h-3.5" />,
};

type Tab = "components" | "cables" | "summary" | "chat";
type View = "workspace" | "overview";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [drawings, setDrawings] = useState<DrawingRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("components");
  const [searchFilter, setSearchFilter] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [view, setView] = useState<View>("workspace");
  const [highlights, setHighlights] = useState<BoundingBox[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pdfFileRef = useRef<File | null>(null);

  // Load project + drawings
  useEffect(() => {
    if (!id) return;
    (async () => {
      const p = await getProject(id);
      if (!p) { router.push("/"); return; }
      setProject(p);
      const d = await getDrawingsByProject(id);
      d.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setDrawings(d);
    })();
  }, [id, router]);

  // Load selected drawing
  useEffect(() => {
    if (!selected) { setPdfUrl(null); setPdfData(null); setAnalysis(null); setHighlights([]); return; }
    (async () => {
      const d = drawings.find((x) => x.id === selected);
      if (!d) return;
      if (d.analysis) {
        setAnalysis(d.analysis as AnalysisResult);
        setExpandedCats(new Set((d.analysis as AnalysisResult).costItems.map((i) => i.category)));
      } else {
        setAnalysis(null);
      }
      const fileData = await getFile(selected);
      if (fileData) {
        setPdfData(fileData);
        const blob = new Blob([fileData], { type: "application/pdf" });
        setPdfUrl(URL.createObjectURL(blob));
        pdfFileRef.current = new File([blob], d.fileName, { type: "application/pdf" });
      }
    })();
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, drawings]);

  // Timer
  useEffect(() => {
    if (analyzing) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [analyzing]);

  // Upload handler
  const onDrop = useCallback(async (files: File[]) => {
    if (!project) return;
    for (const file of files) {
      if (file.type !== "application/pdf") continue;
      const drawingId = crypto.randomUUID();
      const buf = await file.arrayBuffer();
      await saveFile(drawingId, buf);
      const rec: DrawingRecord = {
        id: drawingId, projectId: project.id, fileName: file.name,
        fileSize: file.size, createdAt: new Date().toISOString(), analysis: null,
      };
      await saveDrawing(rec);
      await saveProject({ ...project, updatedAt: new Date().toISOString() });
    }
    const d = await getDrawingsByProject(project.id);
    d.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    setDrawings(d);
    if (d.length > 0 && !selected) setSelected(d[d.length - 1].id);
  }, [project, selected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "application/pdf": [".pdf"] }, maxSize: 50 * 1024 * 1024,
  });

  // Analyze
  const handleAnalyze = async () => {
    if (!selected || !pdfFileRef.current) return;
    setAnalyzing(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("pdf", pdfFileRef.current);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysfel");
      const result = data as AnalysisResult;
      setAnalysis(result);
      setExpandedCats(new Set(result.costItems.map((i) => i.category)));
      setTab("components");
      // Persist
      const d = drawings.find((x) => x.id === selected);
      if (d) { d.analysis = result; await saveDrawing(d); }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Okänt fel");
    } finally { setAnalyzing(false); }
  };

  // Delete drawing
  const handleDeleteDrawing = async (drawingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteDrawing(drawingId);
    if (selected === drawingId) { setSelected(null); setPdfUrl(null); setAnalysis(null); }
    const d = await getDrawingsByProject(id);
    d.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    setDrawings(d);
  };

  // Chat
  const sendChat = async () => {
    if (!chatInput.trim() || !pdfFileRef.current) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim(), timestamp: new Date().toISOString() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput(""); setChatLoading(true);
    try {
      const fd = new FormData();
      fd.append("question", userMsg.content);
      fd.append("pdf", pdfFileRef.current);
      fd.append("history", JSON.stringify(chatMessages.slice(-6)));
      const res = await fetch("/api/chat", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.answer, timestamp: new Date().toISOString() }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Kunde inte svara. Försök igen.", timestamp: new Date().toISOString() }]);
    } finally { setChatLoading(false); }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // Export CSV
  const exportCSV = () => {
    if (!analysis) return;
    const h = ["Kategori", "Komponent", "Symbol", "E-nummer", "Antal", "Enhet", "Placering", "Material", "Arbete", "Totalt"];
    const rows = analysis.costItems.map((i) => [i.category, i.name, i.symbol, i.eNumber || "", i.quantity, i.unit, i.location, i.materialCost, i.laborCost, i.totalCost].join(";"));
    rows.push(""); rows.push(`;;;;;;${analysis.totalMaterial};${analysis.totalLabor};${analysis.grandTotal}`);
    const csv = [h.join(";"), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `mangdning_${analysis.drawingInfo.drawingNumber || "ritning"}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Filter items
  const filtered = analysis ? analysis.costItems.filter((i) =>
    !searchFilter || i.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    i.symbol.toLowerCase().includes(searchFilter.toLowerCase()) ||
    i.category.toLowerCase().includes(searchFilter.toLowerCase())
  ) : [];

  const grouped = filtered.reduce<Record<string, CostLineItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (!project) return <div className="h-full flex items-center justify-center text-slate-400">Laddar...</div>;

  // Collect all analyses for overview
  const allAnalyses = drawings.filter((d) => d.analysis).map((d) => d.analysis as AnalysisResult);
  const allDrawingNames = drawings.filter((d) => d.analysis).map((d) => d.fileName);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "components", label: "Komponenter", icon: <Package className="w-4 h-4" /> },
    { key: "cables", label: "Kablar", icon: <Cable className="w-4 h-4" /> },
    { key: "summary", label: "Summering", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "chat", label: "Chatta", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Top bar */}
      <header className="border-b bg-white dark:bg-slate-800 dark:border-slate-700 shrink-0 px-4 py-2.5 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 rounded-lg">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">{project.name}</h1>
            {project.description && <p className="text-xs text-slate-500 dark:text-slate-400">{project.description}</p>}
          </div>
        </div>
        {/* View toggle */}
        <div className="ml-4 flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
          <button
            onClick={() => setView("workspace")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === "workspace" ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
          >
            Arbetsyta
          </button>
          <button
            onClick={() => setView("overview")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === "overview" ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
          >
            Översikt
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {analysis && (
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 dark:text-slate-200">
              <Download className="w-3.5 h-3.5" /> Exportera CSV
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      {view === "overview" ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            <ProjectStats analyses={allAnalyses} drawingNames={allDrawingNames} />
            <ProjectSummary analyses={allAnalyses} drawingNames={allDrawingNames} projectName={project.name} />
          </div>
        </div>
      ) : (
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: drawings */}
        <div className="w-64 border-r bg-white dark:bg-slate-800 dark:border-slate-700 flex flex-col shrink-0">
          <div className="p-3 border-b">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ritningar</h2>
            <div {...getRootProps()} className={`border border-dashed rounded-lg p-2 text-center cursor-pointer text-xs transition-colors ${isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400"}`}>
              <input {...getInputProps()} />
              <Plus className="w-4 h-4 mx-auto text-slate-400 mb-1" />
              <span className="text-slate-500">Ladda upp PDF</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {drawings.length === 0 && (
              <p className="p-4 text-xs text-slate-400 text-center">Inga ritningar uppladdade</p>
            )}
            {drawings.map((d) => (
              <div
                key={d.id}
                onClick={() => { setSelected(d.id); setChatMessages([]); }}
                className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-slate-50 transition-colors ${selected === d.id ? "bg-blue-50 border-l-2 border-l-blue-600" : "hover:bg-slate-50"}`}
              >
                <FileText className={`w-4 h-4 shrink-0 ${selected === d.id ? "text-blue-600" : "text-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${selected === d.id ? "text-blue-900" : "text-slate-700"}`}>{d.fileName}</p>
                  <p className="text-[10px] text-slate-400">
                    {d.analysis ? "Analyserad" : "Ej analyserad"} · {(d.fileSize / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button onClick={(e) => handleDeleteDrawing(d.id, e)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Center: PDF viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Välj en ritning eller ladda upp en ny</p>
                <p className="text-xs text-slate-400 mt-1">Stöd för PDF-ritningar upp till 50 MB</p>
              </div>
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="shrink-0 px-4 py-2 bg-white border-b flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 truncate">
                  {drawings.find((d) => d.id === selected)?.fileName}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {analyzing && (
                    <span className="text-xs text-blue-600 font-mono">
                      {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}
                    </span>
                  )}
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    {analyzing ? "Analyserar..." : analysis ? "Analysera igen" : "Analysera"}
                  </button>
                </div>
              </div>
              {error && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600">{error}</div>
              )}
              {/* PDF viewer */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-900">
                {pdfData ? (
                  <PdfViewer data={pdfData} highlights={highlights} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">Laddar PDF...</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right panel: analysis */}
        {selected && analysis && (
          <div className="w-96 border-l bg-white flex flex-col shrink-0">
            {/* Tabs */}
            <div className="flex border-b shrink-0">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors ${tab === t.key ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {/* Components tab */}
              {tab === "components" && (
                <div>
                  <div className="p-3 border-b sticky top-0 bg-white z-10">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Sök komponenter..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">{filtered.length} komponenter hittade</p>
                  </div>
                  {Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat} className="border-b border-slate-100">
                      <button
                        onClick={() => setExpandedCats((prev) => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; })}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-xs"
                      >
                        <span className="text-blue-600">{catIcons[cat] || <Package className="w-3.5 h-3.5" />}</span>
                        <span className="font-semibold text-slate-800 flex-1 text-left">{cat}</span>
                        <span className="text-slate-400">{items.length}</span>
                        {expandedCats.has(cat) ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                      {expandedCats.has(cat) && (
                        <div className="pb-1">
                          {items.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => item.bbox ? setHighlights([item.bbox]) : setHighlights([])}
                              className={`px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors ${item.bbox && highlights.length === 1 && highlights[0].x === item.bbox.x && highlights[0].y === item.bbox.y ? "bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300" : ""}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-slate-800 truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-400">
                                  {item.symbol}{item.eNumber ? ` · E-nr: ${item.eNumber}` : ""} · {item.location}
                                  {item.bbox && <span className="ml-1 text-blue-500">📍</span>}
                                </p>
                              </div>
                              <span className="font-semibold text-slate-700 tabular-nums">{item.quantity} {item.unit}</span>
                              {item.matched && <span className="text-[10px] text-emerald-600 font-medium">{fmt(item.totalCost)}</span>}
                              {!item.matched && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Ej matchad</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Cables tab */}
              {tab === "cables" && (
                <div className="p-3 space-y-2">
                  <p className="text-xs text-slate-500 mb-3">{analysis.cables.length} kablar identifierade</p>
                  {analysis.cables.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">Inga kablar identifierade i denna ritning.</p>
                  )}
                  {analysis.cables.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => c.bbox ? setHighlights([c.bbox]) : setHighlights([])}
                      className={`bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-xs space-y-1 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all ${c.bbox && highlights.length === 1 && highlights[0].x === c.bbox.x && highlights[0].y === c.bbox.y ? "ring-2 ring-red-400 bg-red-50 dark:bg-red-900/20" : ""}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{c.type} {c.bbox && <span className="text-blue-500">📍</span>}</span>
                        <span className="font-bold text-blue-700">{c.lengthMeters} m</span>
                      </div>
                      {c.designation && <p className="text-slate-500 dark:text-slate-400">Beteckning: {c.designation}</p>}
                      <p className="text-slate-500 dark:text-slate-400">{c.from} → {c.to}</p>
                      <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-medium">{c.system}</span>
                    </div>
                  ))}
                  {analysis.cables.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-semibold text-slate-700">Total kabellängd</p>
                      <p className="text-lg font-bold text-blue-700">{analysis.cables.reduce((s, c) => s + c.lengthMeters, 0).toFixed(1)} m</p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary tab */}
              {tab === "summary" && (
                <div className="p-3 space-y-4">
                  {/* Drawing info */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ritningsinfo</h3>
                    <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5">
                      {analysis.drawingInfo.title && <p><span className="text-slate-500">Titel:</span> <span className="font-medium">{analysis.drawingInfo.title}</span></p>}
                      {analysis.drawingInfo.drawingNumber && <p><span className="text-slate-500">Nr:</span> <span className="font-medium">{analysis.drawingInfo.drawingNumber}</span></p>}
                      {analysis.drawingInfo.scale && <p><span className="text-slate-500">Skala:</span> <span className="font-medium">{analysis.drawingInfo.scale}</span></p>}
                      {analysis.drawingInfo.designer && <p><span className="text-slate-500">Konstruktör:</span> <span className="font-medium">{analysis.drawingInfo.designer}</span></p>}
                    </div>
                  </div>

                  {/* Cost summary */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Kostnad</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Material</span>
                        <span className="font-semibold">{fmt(analysis.totalMaterial)}</span>
                      </div>
                      <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                        <span className="text-slate-600">Arbete</span>
                        <span className="font-semibold">{fmt(analysis.totalLabor)}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-3">
                        <span className="font-bold">Totalt</span>
                        <span className="font-bold text-blue-700">{fmt(analysis.grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Statistik</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-blue-700">{analysis.costItems.length}</p>
                        <p className="text-[10px] text-blue-600">Komponenter</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-emerald-700">{analysis.cables.length}</p>
                        <p className="text-[10px] text-emerald-600">Kablar</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-amber-700">{analysis.costItems.filter((i) => i.matched).length}</p>
                        <p className="text-[10px] text-amber-600">Prismatchade</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-purple-700">{analysis.cables.reduce((s, c) => s + c.lengthMeters, 0).toFixed(0)}</p>
                        <p className="text-[10px] text-purple-600">Meter kabel</p>
                      </div>
                    </div>
                  </div>

                  {/* Summary text */}
                  {analysis.summary && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sammanfattning</h3>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3">{analysis.summary}</p>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400">* Priserna är uppskattningar baserade på standardpriser.</p>
                </div>
              )}

              {/* Chat tab */}
              {tab === "chat" && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-8">
                        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-medium">Fråga dokumenten</p>
                        <p className="text-[10px] text-slate-400 mt-1">Ställ frågor om ritningen, krav eller specifikationer</p>
                      </div>
                    )}
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200"}`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 px-3 py-2 rounded-xl">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-3 border-t bg-white dark:bg-slate-800 dark:border-slate-700">
                    <div className="flex gap-2">
                      <input
                        type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                        placeholder="Ställ en fråga om ritningen..."
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={chatLoading}
                      />
                      <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
                        Skicka
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

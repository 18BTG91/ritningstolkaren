"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderOpen,
  Zap,
  Trash2,
  FileText,
  Clock,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import {
  getProjects,
  saveProject,
  deleteProject,
  getDrawingsByProject,
  type ProjectRecord,
} from "@/lib/db";

interface ProjectWithStats extends ProjectRecord {
  drawingCount: number;
}

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    const allProjects = await getProjects();
    const withStats: ProjectWithStats[] = await Promise.all(
      allProjects.map(async (p) => {
        const drawings = await getDrawingsByProject(p.id);
        return { ...p, drawingCount: drawings.length };
      })
    );
    withStats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setProjects(withStats);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      description: newDesc.trim(),
      createdAt: now,
      updatedAt: now,
    };
    await saveProject(project);
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    router.push(`/project/${project.id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Vill du ta bort detta projekt och alla ritningar?")) {
      await deleteProject(id);
      await loadProjects();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b bg-white shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Ritningstolkaren</h1>
              <p className="text-xs text-slate-500">AI-driven mängdning & kalkylering</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nytt projekt
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Hero */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Mina projekt</h2>
            <p className="text-slate-500">
              Skapa ett projekt, ladda upp ritningar och få automatisk mängdning med AI.
            </p>
          </div>

          {/* Create dialog */}
          {showCreate && (
            <div className="mb-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Skapa nytt projekt</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Projektnamn *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="T.ex. Kv. Björken — Elinstallation"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Beskrivning</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Valfri beskrivning av projektet"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setShowCreate(false); setNewName(""); setNewDesc(""); }}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Skapa projekt
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Projects grid */}
          {loading ? (
            <div className="text-center py-20 text-slate-400">Laddar projekt...</div>
          ) : projects.length === 0 && !showCreate ? (
            <div className="text-center py-20">
              <div className="mx-auto w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
                <FolderOpen className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Inga projekt ännu</h3>
              <p className="text-slate-500 mb-6">Skapa ditt första projekt för att komma igång.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Skapa projekt
              </button>

              {/* Feature cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Symbolräkning</h4>
                  <p className="text-sm text-slate-500">AI identifierar och räknar alla elektriska symboler automatiskt.</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Kabelmätning</h4>
                  <p className="text-sm text-slate-500">Automatisk längdmätning av kabeldragningar med systemklassificering.</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Mängdsummering</h4>
                  <p className="text-sm text-slate-500">Generera färdiga mängdlistor och kostnadskalkyler direkt.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/project/${p.id}`)}
                  className="group bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <FolderOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Ta bort projekt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">{p.name}</h3>
                  {p.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {p.drawingCount} ritning{p.drawingCount !== 1 ? "ar" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(p.updatedAt).toLocaleDateString("sv-SE")}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

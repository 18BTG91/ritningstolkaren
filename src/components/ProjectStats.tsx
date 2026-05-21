"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { AnalysisResult } from "@/lib/types";

interface Props {
  analyses: AnalysisResult[];
  drawingNames: string[];
}

const COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444"];

export default function ProjectStats({ analyses, drawingNames }: Props) {
  if (analyses.length === 0) return null;

  // Cost per drawing
  const costPerDrawing = analyses.map((a, i) => ({
    name: drawingNames[i]?.replace(".pdf", "").slice(0, 20) || `Ritning ${i + 1}`,
    material: a.totalMaterial,
    arbete: a.totalLabor,
  }));

  // Category distribution
  const categoryMap: Record<string, number> = {};
  analyses.forEach((a) => {
    a.costItems.forEach((item) => {
      categoryMap[item.category] = (categoryMap[item.category] || 0) + item.quantity;
    });
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Cable summary
  const cableMap: Record<string, number> = {};
  analyses.forEach((a) => {
    a.cables.forEach((c) => {
      cableMap[c.type] = (cableMap[c.type] || 0) + c.lengthMeters;
    });
  });
  const cableData = Object.entries(cableMap)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);

  // Totals
  const totalMaterial = analyses.reduce((s, a) => s + a.totalMaterial, 0);
  const totalLabor = analyses.reduce((s, a) => s + a.totalLabor, 0);
  const totalComponents = analyses.reduce((s, a) => s + a.costItems.length, 0);
  const totalCables = analyses.reduce((s, a) => s + a.cables.length, 0);
  const totalCableLength = analyses.reduce((s, a) => s + a.cables.reduce((cs, c) => cs + c.lengthMeters, 0), 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Totalt material</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{fmt(totalMaterial)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Totalt arbete</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{fmt(totalLabor)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Totalkostnad</p>
          <p className="text-lg font-bold text-blue-600">{fmt(totalMaterial + totalLabor)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Komponenter</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{totalComponents}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Kabel (m)</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{Math.round(totalCableLength)}</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost per drawing */}
        {costPerDrawing.length > 1 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Kostnad per ritning</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={costPerDrawing} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="material" stackId="a" fill="#3b82f6" name="Material" radius={[0, 0, 0, 0]} />
                <Bar dataKey="arbete" stackId="a" fill="#8b5cf6" name="Arbete" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category pie */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Fördelning per kategori</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {categoryData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {categoryData.slice(0, 6).map((d, idx) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-600 dark:text-slate-300 flex-1 truncate">{d.name}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cable breakdown */}
      {cableData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Kabellängder per typ</h3>
          <ResponsiveContainer width="100%" height={Math.max(120, cableData.length * 32)}>
            <BarChart data={cableData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} unit=" m" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
              <Tooltip formatter={(v) => `${Number(v)} m`} />
              <Bar dataKey="value" fill="#06b6d4" name="Längd" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

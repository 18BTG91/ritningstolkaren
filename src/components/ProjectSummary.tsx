"use client";

import { Download } from "lucide-react";
import type { AnalysisResult, CostLineItem } from "@/lib/types";

interface Props {
  analyses: AnalysisResult[];
  drawingNames: string[];
  projectName: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function ProjectSummary({ analyses, drawingNames, projectName }: Props) {
  if (analyses.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-sm">Inga analyserade ritningar att summera.</p>
      </div>
    );
  }

  // Merge all cost items across drawings
  const mergedComponents: Record<string, CostLineItem & { drawings: string[] }> = {};

  analyses.forEach((a, idx) => {
    const dName = drawingNames[idx] || `Ritning ${idx + 1}`;
    a.costItems.forEach((item) => {
      const key = `${item.name}__${item.eNumber || item.symbol}`;
      if (mergedComponents[key]) {
        mergedComponents[key].quantity += item.quantity;
        mergedComponents[key].materialCost += item.materialCost;
        mergedComponents[key].laborCost += item.laborCost;
        mergedComponents[key].totalCost += item.totalCost;
        if (!mergedComponents[key].drawings.includes(dName)) {
          mergedComponents[key].drawings.push(dName);
        }
      } else {
        mergedComponents[key] = { ...item, drawings: [dName] };
      }
    });
  });

  const mergedList = Object.values(mergedComponents).sort((a, b) => b.totalCost - a.totalCost);

  // Group by category
  const grouped = mergedList.reduce<Record<string, typeof mergedList>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Cable summary
  const cableMap: Record<string, { type: string; totalLength: number; systems: Set<string> }> = {};
  analyses.forEach((a) => {
    a.cables.forEach((c) => {
      if (!cableMap[c.type]) cableMap[c.type] = { type: c.type, totalLength: 0, systems: new Set() };
      cableMap[c.type].totalLength += c.lengthMeters;
      if (c.system) cableMap[c.type].systems.add(c.system);
    });
  });
  const cableList = Object.values(cableMap).sort((a, b) => b.totalLength - a.totalLength);

  const totalMaterial = analyses.reduce((s, a) => s + a.totalMaterial, 0);
  const totalLabor = analyses.reduce((s, a) => s + a.totalLabor, 0);

  // Export full project report
  const exportReport = () => {
    const lines: string[] = [];
    lines.push(`PROJEKTRAPPORT: ${projectName}`);
    lines.push(`Datum: ${new Date().toLocaleDateString("sv-SE")}`);
    lines.push(`Antal ritningar: ${analyses.length}`);
    lines.push("");
    lines.push("=== SAMMANSTÄLLD MÄNGDFÖRTECKNING ===");
    lines.push("");
    lines.push("Kategori;Komponent;E-nummer;Antal;Enhet;Material (kr);Arbete (kr);Totalt (kr);Ritningar");

    mergedList.forEach((item) => {
      lines.push([
        item.category, item.name, item.eNumber || "", item.quantity, item.unit,
        item.materialCost, item.laborCost, item.totalCost, item.drawings.join(", ")
      ].join(";"));
    });

    lines.push("");
    lines.push("=== KABELSAMMANSTÄLLNING ===");
    lines.push("");
    lines.push("Kabeltyp;Total längd (m);System");
    cableList.forEach((c) => {
      lines.push(`${c.type};${c.totalLength.toFixed(1)};${Array.from(c.systems).join(", ")}`);
    });

    lines.push("");
    lines.push("=== KOSTNADSSAMMANFATTNING ===");
    lines.push(`Total materialkostnad;${totalMaterial}`);
    lines.push(`Total arbetskostnad;${totalLabor}`);
    lines.push(`TOTALT;${totalMaterial + totalLabor}`);

    const csv = lines.join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `projektrapport_${projectName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sammanställning — alla ritningar</h3>
          <p className="text-sm text-slate-500">{analyses.length} ritningar, {mergedList.length} unika poster</p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportera projektrapport
        </button>
      </div>

      {/* Grand total */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-blue-200 text-xs">Material</p>
            <p className="text-xl font-bold">{fmt(totalMaterial)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Arbete</p>
            <p className="text-xl font-bold">{fmt(totalLabor)}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Totalt</p>
            <p className="text-2xl font-bold">{fmt(totalMaterial + totalLabor)}</p>
          </div>
        </div>
      </div>

      {/* Merged component table by category */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-750 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{cat}</span>
              <span className="text-xs text-slate-500">{items.length} poster · {fmt(items.reduce((s, i) => s + i.totalCost, 0))}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left px-3 py-2 font-medium">Komponent</th>
                    <th className="text-left px-3 py-2 font-medium">E-nr</th>
                    <th className="text-right px-3 py-2 font-medium">Antal</th>
                    <th className="text-right px-3 py-2 font-medium">Material</th>
                    <th className="text-right px-3 py-2 font-medium">Arbete</th>
                    <th className="text-right px-3 py-2 font-medium">Totalt</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{item.name}</td>
                      <td className="px-3 py-2 text-slate-500 font-mono">{item.eNumber || "–"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{item.materialCost > 0 ? fmt(item.materialCost) : "–"}</td>
                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">{item.laborCost > 0 ? fmt(item.laborCost) : "–"}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">{item.totalCost > 0 ? fmt(item.totalCost) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Cable summary */}
      {cableList.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-750 border-b border-slate-200 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Kabelsammanställning</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-3 py-2 font-medium">Kabeltyp</th>
                  <th className="text-right px-3 py-2 font-medium">Total längd</th>
                  <th className="text-left px-3 py-2 font-medium">System</th>
                </tr>
              </thead>
              <tbody>
                {cableList.map((c, idx) => (
                  <tr key={idx} className="border-b border-slate-50 dark:border-slate-700/50">
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{c.type}</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-600">{c.totalLength.toFixed(1)} m</td>
                    <td className="px-3 py-2 text-slate-500">{Array.from(c.systems).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

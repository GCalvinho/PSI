"use client";

import { useState } from "react";
import { Contract } from "@/lib/types";
import { Search, TrendingUp } from "lucide-react";

function fmt(val: number) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  return `$${(val / 1e6).toFixed(1)}M`;
}

const SET_ASIDE_LABELS: Record<string, string> = {
  SBA: "Small Business", SBP: "Small Business",
  "8A": "8(a)", HZC: "HUBZone", HZS: "HUBZone",
  WOSB: "WOSB", EDWOSB: "EDWOSB",
  VSB: "Veteran", SDVOSBC: "SDVOSB-C", SDVOSBS: "SDVOSB-S",
};

export default function ContractTable({ contracts }: { contracts: Contract[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"amount" | "date">("amount");

  const filtered = contracts
    .filter((c) => {
      const q = query.toLowerCase();
      return (
        c["Recipient Name"].toLowerCase().includes(q) ||
        (c["Description"] || "").toLowerCase().includes(q) ||
        (c["Awarding Agency"] || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      sort === "amount"
        ? b["Award Amount"] - a["Award Amount"]
        : new Date(b["Award Date"]).getTime() - new Date(a["Award Date"]).getTime()
    );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-zinc-800">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Filtrar por empresa, agência ou descrição..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(["amount", "date"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                sort === s
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {s === "amount" ? "Por Valor" : "Por Data"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 border-b border-zinc-800">
              <th className="text-left px-4 py-3 font-medium">Empresa</th>
              <th className="text-left px-4 py-3 font-medium">Agência</th>
              <th className="text-left px-4 py-3 font-medium">Set-Aside</th>
              <th className="text-right px-4 py-3 font-medium">Valor</th>
              <th className="text-left px-4 py-3 font-medium">Ticker</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filtered.map((c) => (
              <tr key={c["Award ID"]} className="hover:bg-zinc-800/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-200 max-w-[220px] truncate" title={c["Recipient Name"]}>
                    {c["Recipient Name"]}
                  </p>
                  <p className="text-xs text-zinc-600 max-w-[220px] truncate mt-0.5" title={c["Description"]}>
                    {c["Description"]}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400 max-w-[160px]">
                  <span className="line-clamp-2">{c["Awarding Agency"]}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-md">
                    {SET_ASIDE_LABELS[c["Type of Set Aside"]] || c["Type of Set Aside"] || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                  {fmt(c["Award Amount"])}
                </td>
                <td className="px-4 py-3">
                  {c.stock?.ticker ? (
                    <span className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                      <TrendingUp size={11} />
                      {c.stock.ticker}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.stock?.revolut ? (
                    <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-md">
                      Revolut ✓
                    </span>
                  ) : c.stock?.ticker ? (
                    <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md">
                      Em bolsa
                    </span>
                  ) : (
                    <span className="text-xs bg-zinc-800/50 text-zinc-600 px-2 py-0.5 rounded-md">
                      Privada
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-zinc-600 py-10 text-sm">Nenhum resultado encontrado.</p>
        )}
      </div>
    </div>
  );
}

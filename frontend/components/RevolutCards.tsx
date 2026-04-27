"use client";

import { Contract } from "@/lib/types";
import { TrendingUp, Star } from "lucide-react";

function fmt(val: number) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  return `$${(val / 1e6).toFixed(1)}M`;
}

const SET_ASIDE_LABELS: Record<string, string> = {
  SBA: "Small Business", SBP: "Small Business",
  "8A": "8(a) Program", HZC: "HUBZone", HZS: "HUBZone",
  WOSB: "Women Owned", EDWOSB: "Women Owned",
  VSB: "Veteran", SDVOSBC: "Veteran", SDVOSBS: "Veteran",
};

export default function RevolutCards({ contracts }: { contracts: Contract[] }) {
  const revolut = contracts
    .filter((c) => c.stock?.revolut)
    .sort((a, b) => b["Award Amount"] - a["Award Amount"]);

  if (revolut.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
        Nenhuma empresa cotada na Revolut encontrada hoje.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {revolut.map((c) => (
        <div
          key={c["Award ID"]}
          className="bg-zinc-900 border border-amber-500/30 rounded-xl p-5 flex flex-col gap-4 hover:border-amber-500/60 transition-colors"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-zinc-100 leading-tight">
                {c["Recipient Name"]}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{c["Awarding Agency"]}</p>
            </div>
            <Star size={16} className="text-amber-400 shrink-0 mt-0.5" />
          </div>

          {/* Ticker badge */}
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/15 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <TrendingUp size={11} />
              {c.stock.ticker}
            </span>
            <span className="text-xs text-zinc-500">{c.stock.exchange}</span>
            <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
              {SET_ASIDE_LABELS[c["Type of Set Aside"]] || c["Type of Set Aside"]}
            </span>
          </div>

          {/* Amount */}
          <div className="bg-zinc-800/60 rounded-lg px-4 py-3">
            <p className="text-xs text-zinc-500 mb-0.5">Valor do Contrato</p>
            <p className="text-xl font-bold text-emerald-400">{fmt(c["Award Amount"])}</p>
          </div>

          {/* Description */}
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
            {c["Description"]}
          </p>

          {/* Footer */}
          <div className="flex justify-between text-xs text-zinc-600 border-t border-zinc-800 pt-3">
            <span>{c["NAICS Description"]}</span>
            <span>{c["Place of Performance State Code"]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

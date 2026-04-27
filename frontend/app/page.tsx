"use client";

import { useEffect, useState } from "react";
import { Contract, FetcherData } from "@/lib/mockData";
import KPICards from "@/components/KPICards";
import Charts from "@/components/Charts";
import ContractTable from "@/components/ContractTable";
import RevolutCards from "@/components/RevolutCards";
import { RefreshCw, Star, Table, BarChart2 } from "lucide-react";

type Tab = "revolut" | "all" | "charts";

export default function Home() {
  const [data, setData] = useState<FetcherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("revolut");
  const [lastUpdate, setLastUpdate] = useState<string>("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/contracts");
    const json: FetcherData = await res.json();
    setData(json);
    setLastUpdate(new Date(json.fetched_at).toLocaleString("pt-PT"));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const contracts: Contract[] = data?.contracts ?? [];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "revolut", label: "Revolut",          icon: <Star size={14} /> },
    { id: "charts",  label: "Gráficos",         icon: <BarChart2 size={14} /> },
    { id: "all",     label: "Todos",            icon: <Table size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              PSI <span className="text-zinc-500 font-normal">Cockpit</span>
            </h1>
            <p className="text-xs text-zinc-500">
              Contratos federais ≥ $25M · PMEs · {new Date().toLocaleDateString("pt-PT")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <span className="text-xs text-zinc-600 hidden sm:block">
                Atualizado: {lastUpdate}
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <RefreshCw size={24} className="animate-spin" />
              <span className="text-sm">A carregar dados...</span>
            </div>
          </div>
        ) : (
          <>
            <KPICards contracts={contracts} />

            {/* Tabs */}
            <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
              {tabs.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === id
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {icon}
                  {label}
                  {id === "revolut" && (
                    <span className="bg-amber-500/20 text-amber-400 text-xs px-1.5 py-0.5 rounded-md">
                      {contracts.filter((c) => c.stock?.revolut).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === "revolut" && <RevolutCards contracts={contracts} />}
            {tab === "charts"  && <Charts contracts={contracts} />}
            {tab === "all"     && <ContractTable contracts={contracts} />}
          </>
        )}
      </main>
    </div>
  );
}

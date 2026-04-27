"use client";

import { useEffect, useState } from "react";
import { Contract, FetcherData } from "@/lib/types";
import {
  fetchTodayContracts,
  loadStaticData,
  loadTickerMap,
  applyTickerMap,
} from "@/lib/usaSpending";
import KPICards from "@/components/KPICards";
import Charts from "@/components/Charts";
import ContractTable from "@/components/ContractTable";
import RevolutCards from "@/components/RevolutCards";
import { RefreshCw, Star, Table, BarChart2, AlertCircle } from "lucide-react";

type Tab    = "revolut" | "all" | "charts";
type Status = "idle" | "fetching" | "loading" | "error";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Home() {
  const [data, setData]         = useState<FetcherData | null>(null);
  const [status, setStatus]     = useState<Status>("loading");
  const [statusMsg, setStatusMsg] = useState("");
  const [tab, setTab]           = useState<Tab>("revolut");

  async function loadFromStatic() {
    const [fetched, tickerMap] = await Promise.all([
      loadStaticData(BASE_PATH),
      loadTickerMap(BASE_PATH),
    ]);
    fetched.contracts = applyTickerMap(fetched.contracts, tickerMap);
    setData(fetched);
  }

  async function handleRefresh() {
    setStatus("fetching");
    setStatusMsg("A pesquisar na USASpending.gov...");

    try {
      const tickerMap = await loadTickerMap(BASE_PATH);
      const contracts = await fetchTodayContracts();
      const enriched  = applyTickerMap(contracts, tickerMap);

      setData({
        fetched_at: new Date().toISOString(),
        contracts:  enriched,
      });
      setStatus("idle");
      setStatusMsg("");
    } catch (err) {
      setStatus("error");
      setStatusMsg(`Erro: ${err instanceof Error ? err.message : "falha na API"}`);
    }
  }

  useEffect(() => {
    loadFromStatic().then(() => setStatus("idle"));
  }, []);

  const contracts: Contract[] = data?.contracts ?? [];
  const lastUpdate = data?.fetched_at
    ? new Date(data.fetched_at).toLocaleString("pt-PT")
    : null;

  const isBusy = status === "fetching" || status === "loading";

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "revolut", label: "Revolut",  icon: <Star size={14} /> },
    { id: "charts",  label: "Gráficos", icon: <BarChart2 size={14} /> },
    { id: "all",     label: "Todos",    icon: <Table size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              PSI <span className="text-zinc-500 font-normal">Cockpit</span>
            </h1>
            <p className="text-xs text-zinc-500">
              Contratos federais ≥ $25M · PMEs · {new Date().toLocaleDateString("pt-PT")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-zinc-600 hidden sm:block">
                Última pesquisa: {lastUpdate}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isBusy}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <RefreshCw size={13} className={isBusy ? "animate-spin" : ""} />
              {status === "fetching" ? "A pesquisar..." : "Atualizar"}
            </button>
          </div>
        </div>

        {/* Status bar */}
        {statusMsg && (
          <div className={`px-6 py-2 text-xs flex items-center gap-2 ${
            status === "error"
              ? "bg-red-950/60 text-red-400 border-t border-red-900"
              : "bg-blue-950/40 text-blue-400 border-t border-blue-900/40"
          }`}>
            {status === "error"
              ? <AlertCircle size={12} />
              : <RefreshCw size={12} className="animate-spin" />}
            {statusMsg}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {status === "loading" ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <RefreshCw size={24} className="animate-spin" />
              <span className="text-sm">A carregar...</span>
            </div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <AlertCircle size={36} className="text-zinc-700" />
            <div>
              <p className="text-zinc-400 font-medium">Sem dados para hoje</p>
              <p className="text-zinc-600 text-sm mt-1">
                Clica em <strong className="text-zinc-400">Atualizar</strong> para pesquisar agora.
                <br />
                Os dados são automaticamente atualizados a cada 8 horas via GitHub Actions.
              </p>
            </div>
          </div>
        ) : (
          <>
            <KPICards contracts={contracts} />

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

"use client";

import { Contract } from "@/lib/types";
import { TrendingUp, Building2, DollarSign, Star } from "lucide-react";

function fmt(val: number) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  return `$${(val / 1e6).toFixed(1)}M`;
}

export default function KPICards({ contracts }: { contracts: Contract[] }) {
  const total = contracts.reduce((s, c) => s + c["Award Amount"], 0);
  const avg = contracts.length ? total / contracts.length : 0;
  const unique = new Set(contracts.map((c) => c["Recipient Name"])).size;
  const onRevolut = contracts.filter((c) => c.stock?.revolut).length;

  const cards = [
    {
      label: "Total Contratos",
      value: contracts.length.toLocaleString(),
      icon: Building2,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Valor Total",
      value: fmt(total),
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Valor Médio",
      value: fmt(avg),
      icon: TrendingUp,
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
    },
    {
      label: "Disponíveis Revolut",
      value: `${onRevolut} empresas`,
      icon: Star,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={`rounded-xl border p-5 flex flex-col gap-3 ${bg}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">{label}</span>
            <Icon size={18} className={color} />
          </div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

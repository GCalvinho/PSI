"use client";

import { Contract } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#60a5fa", "#34d399", "#a78bfa", "#fb923c", "#f472b6", "#38bdf8", "#facc15"];

function fmt(val: number) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  return `$${(val / 1e6).toFixed(0)}M`;
}

export default function Charts({ contracts }: { contracts: Contract[] }) {
  // Top companies
  const byCompany: Record<string, number> = {};
  contracts.forEach((c) => {
    byCompany[c["Recipient Name"]] = (byCompany[c["Recipient Name"]] || 0) + c["Award Amount"];
  });
  const topCompanies = Object.entries(byCompany)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount]) => ({
      name: name.length > 28 ? name.slice(0, 28) + "…" : name,
      amount,
      label: fmt(amount),
    }));

  // By agency
  const byAgency: Record<string, number> = {};
  contracts.forEach((c) => {
    const agency = c["Awarding Agency"] || "Other";
    byAgency[agency] = (byAgency[agency] || 0) + c["Award Amount"];
  });
  const agencyData = Object.entries(byAgency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.replace("Department of ", "Dept. "), value }));

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number }[] }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200">
          {fmt(payload[0].value)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Top Empresas por Valor</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topCompanies} layout="vertical" margin={{ left: 0, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={190} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {topCompanies.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Distribuição por Agência</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={agencyData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
            >
              {agencyData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Legend
              formatter={(val) => <span className="text-zinc-400 text-xs">{val}</span>}
              iconType="circle"
              iconSize={8}
            />
            <Tooltip
              formatter={(val) => fmt(Number(val))}
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#e4e4e7" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

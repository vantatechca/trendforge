"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Cell,
} from "recharts";

const COLORS = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#06b6d4", "#eab308", "#14b8a6", "#f43f5e", "#0ea5e9", "#d946ef", "#84cc16"];

export function NicheBarChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#666" interval={0} angle={-30} textAnchor="end" height={64} />
        <YAxis tick={{ fontSize: 11 }} stroke="#666" />
        <RTooltip contentStyle={{ background: "#222", border: "1px solid #333", borderRadius: 8 }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="#666" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#666" width={130} />
          <RTooltip contentStyle={{ background: "#222", border: "1px solid #333", borderRadius: 8 }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
        {data.slice(0, 12).map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-medium">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

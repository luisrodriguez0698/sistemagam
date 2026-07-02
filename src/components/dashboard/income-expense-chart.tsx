"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface IncomeExpensePoint {
  mes: string; // ej. "Ene", "Feb"
  ingresos: number;
  gastos: number;
}

export function IncomeExpenseChart({ data }: { data: IncomeExpensePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value)
          }
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            color: "hsl(var(--card-foreground))",
          }}
        />
        <Bar dataKey="ingresos" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
        <Bar dataKey="gastos" fill="hsl(var(--chart-5))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

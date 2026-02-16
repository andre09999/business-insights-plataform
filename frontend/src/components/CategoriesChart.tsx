import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import type { CategoryAgg } from "../types/api";
import { formatBRL } from "../utils/format";

const COLORS = [
  "#6366F1",
  "#22D3EE",
  "#10B981",
  "#F59E0B",
  "#A855F7",
  "#F472B6",
  "#14B8A6",
  "#EF4444",
];

function clampLabel(s: string, max = 18) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function CategoriesChart(props: { data: CategoryAgg[] }) {
  const data = (props.data ?? [])
    .slice()
    .sort((a, b) => b.value - a.value)
    .map((d) => ({
      ...d,
      categoryShort: clampLabel(d.category),
    }));

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">Top categorias</div>
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
          Sem dados no período selecionado.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 text-sm text-white/70">Top categorias</div>

      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 8, left: 12 }}
          >
            <CartesianGrid horizontal={false} opacity={0.12} />

            {/* Remove números do eixo X */}
            <XAxis type="number" hide />

            <YAxis
              type="category"
              dataKey="categoryShort"
              width={110}
              tick={{ fill: "rgba(255,255,255,0.75)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              formatter={(value) => formatBRL(Number(value))}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.category ?? ""
              }
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.85)",
                color: "white",
              }}
              itemStyle={{ color: "white" }}
              labelStyle={{ color: "rgba(255,255,255,0.8)" }}
              cursor={{ opacity: 0.12 }}
            />

            <Bar dataKey="value" radius={[12, 12, 12, 12]}>
              {data.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={i === 0 ? "#FFFFFF" : COLORS[i % COLORS.length]}
                  fillOpacity={i === 0 ? 0.9 : 0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 🔥 Legenda personalizada */}
      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/80 md:grid-cols-2">
  {data.map((item, i) => (
    <div
      key={item.category}
      className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="h-3 w-3 rounded-sm"
          style={{
            backgroundColor:
              i === 0 ? "#FFFFFF" : COLORS[i % COLORS.length],
            opacity: i === 0 ? 0.9 : 0.75,
          }}
        />
        <span className="truncate text-white/85">
          {item.category}
        </span>
      </div>

      <span className="font-semibold text-white">
        {formatBRL(item.value)}
      </span>
    </div>
  ))}
</div>

    </div>
  );
}

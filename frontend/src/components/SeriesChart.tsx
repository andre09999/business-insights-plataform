import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { SeriesPoint } from "../types/api";
import { formatBRL } from "../utils/format";

function formatDateBR(iso: string) {
  // iso: YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function computeAvg(data: SeriesPoint[]) {
  if (!data.length) return 0;
  const sum = data.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
  return sum / data.length;
}

function chooseTickInterval(n: number) {
  // controla quantos rótulos aparecem no eixo X
  if (n <= 10) return 0;      // mostra todos
  if (n <= 20) return 1;      // 1 sim 1 não
  if (n <= 35) return 2;      // 1 a cada 3
  if (n <= 60) return 4;      // 1 a cada 5
  return 6;                   // 1 a cada 7+
}

export function SeriesChart(props: { data: SeriesPoint[] }) {
  const data = (props.data ?? []).map((p) => ({
    ...p,
    value: Number(p.value) || 0,
  }));

  const hasData = data.length > 0;
  const avg = computeAvg(data);
  const interval = chooseTickInterval(data.length);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-white/70">Série temporal (vendas por dia)</div>
        <div className="text-xs text-white/50">{hasData ? `${data.length} dia(s)` : ""}</div>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
          Sem dados para o período selecionado.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 8, right: 18, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id="seriesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" opacity={0.12} />

              <XAxis
                dataKey="date"
                interval={interval}
                tickFormatter={formatDateBR}
                tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tickFormatter={(v) => formatBRL(Number(v))}
                tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={92}
              />

              <Tooltip
                formatter={(value) => formatBRL(Number(value))}
                labelFormatter={(label) => `Data: ${formatDateBR(String(label))}`}
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

              {/* Média do período */}
              <ReferenceLine
                y={avg}
                stroke="rgba(255,255,255,0.35)"
                strokeDasharray="4 4"
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth={2}
                fill="url(#seriesFill)"
                dot={false}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasData && (
        <div className="mt-3 text-xs text-white/50">
          * Linha tracejada = média do período ({formatBRL(avg)}).
        </div>
      )}
    </div>
  );
}

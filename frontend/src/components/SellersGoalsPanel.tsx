/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import type { SellerRankingRow } from "../types/api";
import { formatBRL } from "../utils/format";

const META_GERAL = 150_000;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function statusFrom(progress: number) {
  if (progress >= 1) return { label: "Meta batida", badge: "good", bar: "bg-emerald-400/80" };
  if (progress >= 0.75) return { label: "Em risco", badge: "warn", bar: "bg-amber-300/80" };
  return { label: "Atrasado", badge: "bad", bar: "bg-rose-400/80" };
}

function badgeClass(kind: "good" | "warn" | "bad") {
  if (kind === "good") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  if (kind === "warn") return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-rose-500/30 bg-rose-500/10 text-rose-100";
}

export function SellersGoalsPanel(props: { rows: SellerRankingRow[] }) {
  const rows = useMemo(
    () => (props.rows ?? []).slice().sort((a, b) => b.total_value - a.total_value),
    [props.rows]
  );

  const [expanded, setExpanded] = useState(false);

  // ✅ divide a meta geral entre TODOS os vendedores do período (após filtros)
  const sellersCount = rows.length;
  const metaPorVendedor = sellersCount > 0 ? META_GERAL / sellersCount : 0;

  const top5 = rows.slice(0, 5);
  const visible = expanded ? rows : top5;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm text-white/80">Metas e performance por vendedor</div>
          <div className="mt-1 text-xs text-white/50">
            Meta geral fixa: <span className="text-white/80">{formatBRL(META_GERAL)}</span>
            {" • "}
            Vendedores no período: <span className="text-white/80">{sellersCount}</span>
            {" • "}
            Meta por vendedor:{" "}
            <span className="text-white/80">
              {sellersCount > 0 ? formatBRL(metaPorVendedor) : "—"}
            </span>
          </div>
        </div>

        <button
          className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
          onClick={() => setExpanded((v) => !v)}
          disabled={rows.length <= 5}
          title={rows.length <= 5 ? "Não há mais vendedores para expandir" : ""}
        >
          {expanded ? "Mostrar Top 5" : "Ver todos"}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
          Sem vendedores para o período selecionado.
        </div>
      ) : (
        <div
          className={[
            expanded ? "max-h-[380px] overflow-auto" : "",
            "rounded-2xl border border-white/10 bg-black/10",
          ].join(" ")}
        >
          <div className="divide-y divide-white/10">
            {visible.map((r, idx) => {
              const goal = metaPorVendedor;
              const progress = goal > 0 ? r.total_value / goal : 0;
              const falta = goal > 0 ? Math.max(0, goal - r.total_value) : 0;

              const st = statusFrom(progress);

              return (
                <div key={r.seller_id} className="p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-white">
                          #{idx + 1} • {r.seller_name}
                        </div>

                        <span className={`rounded-full border px-2 py-0.5 text-xs ${badgeClass(st.badge as any)}`}>
                          {st.label}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-white/60">
                        Total: <span className="text-white/80">{formatBRL(r.total_value)}</span>
                        {" • "}
                        Média diária: <span className="text-white/80">{formatBRL(r.avg_daily_value)}</span>
                        {" • "}
                        Dias: <span className="text-white/80">{r.days}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/75">
                        Meta: <span className="font-semibold text-white">{formatBRL(goal)}</span>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/75">
                        Falta: <span className="font-semibold text-white">{formatBRL(falta)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Progresso: {Math.round(clamp(progress, 0, 1) * 100)}%</span>
                      <span className="text-white/70">
                        {progress >= 1 ? "✅ atingiu a meta" : "🎯 em andamento"}
                      </span>
                    </div>

                    <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                      <div
                        className={`h-2 rounded-full ${st.bar}`}
                        style={{ width: `${clamp(progress * 100, 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rows.length > 5 && !expanded && (
        <div className="mt-3 text-xs text-white/50">
          * Clique em “Ver todos” para abrir a lista completa em uma caixa com scroll.
        </div>
      )}
    </div>
  );
}

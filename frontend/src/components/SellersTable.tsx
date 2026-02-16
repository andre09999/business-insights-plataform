import type { SellerRankingRow } from "../types/api";
import { formatBRL } from "../utils/format";

function medal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "•";
}

function pct(n: number) {
  return `${Math.round(n)}%`;
}

export function SellersTable(props: { rows: SellerRankingRow[] }) {
  const rows = (props.rows ?? []).slice().sort((a, b) => b.total_value - a.total_value);

  const maxTotal = rows[0]?.total_value ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm text-white/80">Ranking de vendedores</div>
          <div className="mt-1 text-xs text-white/50">Ordenado por total vendido</div>
        </div>

        <div className="text-xs text-white/50">
          {rows.length > 0 ? `${rows.length} vendedor(es)` : ""}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
          Nenhum vendedor encontrado para o período/filtro selecionado.
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-white/10">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-neutral-950/70 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/50">
              <tr className="text-white/70">
                <th className="px-3 py-2 w-[70px]">Pos.</th>
                <th className="px-3 py-2">Vendedor</th>
                <th className="px-3 py-2 w-[200px]">Total vendido</th>
                <th className="px-3 py-2 w-[220px]">Participação</th>
                <th className="px-3 py-2 w-[180px]">Média diária</th>
              </tr>
            </thead>

            <tbody className="text-white/85">
              {rows.map((r, idx) => {
                const rank = idx + 1;
                const share = maxTotal > 0 ? (r.total_value / maxTotal) * 100 : 0; // 0–100 relativo ao top1

                return (
                  <tr
                    key={r.seller_id}
                    className={[
                      "border-t border-white/10",
                      idx % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent",
                      rank === 1 ? "bg-white/[0.06]" : "",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="mr-2">{medal(rank)}</span>
                      <span className="text-white/70">{rank}º</span>
                    </td>

                    <td className="px-3 py-2">
                      <div className="font-medium text-white">{r.seller_name}</div>
                    </td>

                    <td className="px-3 py-2 font-semibold">{formatBRL(r.total_value)}</td>

                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-full max-w-[160px] rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-white/70"
                            style={{ width: `${Math.max(3, Math.min(100, share))}%` }}
                          />
                        </div>
                        <div className="text-xs text-white/70 w-[48px] text-right">
                          {pct(share)}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2">{formatBRL(r.avg_daily_value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-3 text-xs text-white/50">
          * “Participação” é relativa ao Top 1 (barra cheia = maior vendedor).
        </div>
      )}
    </div>
  );
}

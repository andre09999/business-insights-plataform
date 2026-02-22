import type { SeriesPoint, SellerRankingRow } from "../types/api";

type Insight = { icon: string; title: string; body: string; severity?: "info" | "good" | "warn" };

function toDate(iso: string) {
  // iso YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function mean(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function pct(a: number, b: number) {
  // % change from b -> a (a vs b)
  if (b === 0) return null;
  return ((a - b) / b) * 100;
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function buildInsights(args: {
  series: SeriesPoint[];
  sellers: SellerRankingRow[];
}) {
  const series = (args.series ?? [])
    .map((p) => ({ date: p.date, value: Number(p.value) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const sellers = (args.sellers ?? []).slice().sort((a, b) => b.total_value - a.total_value);

  const insights: Insight[] = [];

  // 🏆 Vendedor campeão
  if (sellers.length >= 1) {
    const top1 = sellers[0];
    const top2 = sellers[1];
    const diff = top2 ? top1.total_value - top2.total_value : null;
    const diffPct = top2 ? pct(top1.total_value, top2.total_value) : null;

    insights.push({
      icon: "🏆",
      title: "Vendedor campeão",
      severity: "good",
      body:
        top2
          ? `${top1.seller_name} lidera com ${brl(top1.total_value)} — vantagem de ${brl(
              diff!
            )} (${diffPct !== null ? diffPct.toFixed(1) + "% " : ""}sobre o 2º).`
          : `${top1.seller_name} é o único vendedor no período, total ${brl(top1.total_value)}.`,
    });
  }

  if (series.length < 7) {
    // ainda dá para mostrar picos semanais com pouco, mas queda e sazonalidade ficam fracos
    if (series.length > 0) {
      insights.push({
        icon: "ℹ️",
        title: "Poucos dados no período",
        severity: "info",
        body: `Há ${series.length} dia(s) no período. Alguns insights (queda/semana/sazonalidade) ficam mais confiáveis com 14+ dias.`,
      });
    }
    return insights;
  }

  // 📊 Picos semanais (dia da semana com maior média)
  // JS: 0=Dom,1=Seg,...6=Sáb
  const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const buckets: { [k: number]: number[] } = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  for (const p of series) {
    const wd = toDate(p.date).getDay();
    buckets[wd].push(p.value);
  }

  const weekdayAvg = Object.entries(buckets).map(([k, values]) => ({
    weekday: Number(k),
    avg: mean(values),
    count: values.length,
  }));

  weekdayAvg.sort((a, b) => b.avg - a.avg);
  const best = weekdayAvg[0];
  const worst = weekdayAvg[weekdayAvg.length - 1];

if (best && worst && best.count > 0 && worst.count > 0) {
  const d = pct(best.avg, worst.avg);

  insights.push({
    icon: "📊",
    title: "Picos semanais",
    severity: "info",
    body: `O melhor dia da semana é ${weekdayNames[best.weekday]}, com média de ${brl(best.avg)}. 
O pior desempenho ocorre em ${weekdayNames[worst.weekday]}, com média de ${brl(worst.avg)}.${
      d !== null
        ? ` A diferença média entre eles é de aproximadamente ${d.toLocaleString("pt-BR", {
            maximumFractionDigits: 0,
          })}%.`
        : ""
    }`,
  });
}

  // 📉 Queda em determinado período (pior janela de 7 dias vs média geral)
  const window = 7;
  const values = series.map((p) => p.value);
  const overallAvg = mean(values);

  let minSum = Infinity;
  let minIdx = 0;

  for (let i = 0; i <= values.length - window; i++) {
    const s = sum(values.slice(i, i + window));
    if (s < minSum) {
      minSum = s;
      minIdx = i;
    }
  }

  const winAvg = minSum / window;
  const drop = pct(winAvg, overallAvg);

  if (drop !== null && drop < -12) {
    // só mostra se queda relevante (ajuste o limiar como quiser)
    const start = series[minIdx].date;
    const end = series[minIdx + window - 1].date;
    insights.push({
      icon: "📉",
      title: "Queda relevante detectada",
      severity: "warn",
      body: `Entre ${formatDateBR(start)} e ${formatDateBR(end)}, a média foi ${brl(winAvg)} — cerca de ${Math.abs(
        drop
      ).toFixed(0)}% abaixo da média do período (${brl(overallAvg)}).`,
    });
  }

  // 📈 Sazonalidade (final de mês maior)
  // Heurística: pega os dias 24–31 como "final de mês" quando existirem, e compara com o resto.
  const endMonth: number[] = [];
  const rest: number[] = [];

  for (const p of series) {
    const d = toDate(p.date).getDate();
    if (d >= 24) endMonth.push(p.value);
    else rest.push(p.value);
  }

  if (endMonth.length >= 5 && rest.length >= 5) {
    const avgEnd = mean(endMonth);
    const avgRest = mean(rest);
    const lift = pct(avgEnd, avgRest);

    if (lift !== null && lift > 10) {
      insights.push({
        icon: "📈",
        title: "Sazonalidade: final de mês mais forte",
        severity: "good",
        body: `Dias 24–31 têm média ${brl(avgEnd)} vs ${brl(avgRest)} no restante — aumento ~${lift.toFixed(
          0
        )}%.`,
      });
    } else if (lift !== null && lift < -10) {
      insights.push({
        icon: "📉",
        title: "Sazonalidade: final de mês mais fraco",
        severity: "warn",
        body: `Dias 24–31 têm média ${brl(avgEnd)} vs ${brl(avgRest)} no restante — queda ~${Math.abs(lift).toFixed(
          0
        )}%.`,
      });
    } else {
      insights.push({
        icon: "📌",
        title: "Sazonalidade",
        severity: "info",
        body: `Não houve diferença forte entre final de mês (24–31) e o restante no período selecionado.`,
      });
    }
  }

  return insights;
}
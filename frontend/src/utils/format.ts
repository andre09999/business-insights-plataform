export function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function formatNumber(v: number) {
  return new Intl.NumberFormat("pt-BR").format(v);
}

export function formatDateLongBR(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);

  // Ex: 1 de fevereiro de 2026
  const s = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);

  // deixa a primeira letra maiúscula (opcional, fica mais “premium”)
  return s.charAt(0).toUpperCase() + s.slice(1);
}
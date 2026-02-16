export function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function formatNumber(v: number) {
  return new Intl.NumberFormat("pt-BR").format(v);
}

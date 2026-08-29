export function formatPhp(centavos: number): string {
  const hasCentavos = Math.abs(centavos) % 100 !== 0;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: hasCentavos ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export function percentOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

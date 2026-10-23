const pad = (n: number) => String(n).padStart(2, '0');

// "2026-09-19T14:30:00Z" -> "19/09 às 11:30" (horário local do aparelho).
export function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return '';
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  return `${day} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

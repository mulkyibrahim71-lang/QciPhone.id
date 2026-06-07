export function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumberIDR(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function parseIDR(str: string | number): number {
  if (typeof str === "number") return str;
  if (!str) return 0;
  const digits = str.toString().replace(/[^0-9]/g, "");
  return parseInt(digits, 10) || 0;
}

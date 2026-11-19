export function money(value: string, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currency} ${value}`;
  }
}

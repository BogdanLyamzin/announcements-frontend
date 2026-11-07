export function formatPrice(price: number): string {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency", currency: "UAH", maximumFractionDigits: 2,
  }).format(price);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(date));
}

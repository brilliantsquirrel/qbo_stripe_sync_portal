/**
 * Format an integer amount in cents to a currency string.
 * e.g. formatMoney(10050, "usd") → "$100.50"
 */
export function formatMoney(
  cents: number,
  currency: string = "usd",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Convert a dollar string or number to cents.
 * e.g. dollarsToCents(100.5) → 10050
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars.
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

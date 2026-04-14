export type SupportedCurrency = "EUR" | "USD" | "GBP";

export const MINOR_UNITS: Record<SupportedCurrency, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
} as const;

export const LOCALE_BY_CURRENCY: Record<SupportedCurrency, string> = {
  EUR: "es-ES",
  USD: "en-US",
  GBP: "en-GB",
} as const;

// Moneda por defecto si falla la configuración
export const DEFAULT_CURRENCY: SupportedCurrency = "EUR";

export function parseCurrency(input?: string | null): SupportedCurrency {
  if (!input) return DEFAULT_CURRENCY;
  const code = input.toUpperCase();
  if (code === "USD" || code === "GBP" || code === "EUR") {
    return code as SupportedCurrency;
  }
  return DEFAULT_CURRENCY;
}

export function toMajor(amountMinor: number, currency: SupportedCurrency) {
  const decimals = MINOR_UNITS[currency];
  return amountMinor / 10 ** decimals;
}

export function formatCurrency(
  amountMinor: number,
  currencyInput: string = DEFAULT_CURRENCY,
  localeInput?: string,
) {
  const currency = parseCurrency(currencyInput);
  const locale = localeInput ?? LOCALE_BY_CURRENCY[currency];
  const major = toMajor(amountMinor, currency);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: MINOR_UNITS[currency],
    }).format(major);
  } catch (e) {
    // Fallback por seguridad
    return `${major.toFixed(2)} ${currency}`;
  }
}

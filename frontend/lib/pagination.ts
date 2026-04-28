export const PER_PAGE = 12;

export function parsePage(v: string | string[] | undefined, fallback = 1) {
  if (!v) return fallback;
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const makePageHref = (base: string, p: number) =>
  p <= 1 ? base : `${base}?page=${p}`;

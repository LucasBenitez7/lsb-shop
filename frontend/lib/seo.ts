export type RawSearchParams = Record<string, string | string[] | undefined>;

export function pickFirst(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

export function canonicalFromSearchParams(opts: {
  pathname?: string;
  searchParams: RawSearchParams;
  keep?: string[];
}): string {
  const { pathname = "/", searchParams, keep = [] } = opts;
  const params = new URLSearchParams();

  for (const k of keep) {
    const v = pickFirst(searchParams[k]);
    if (v) params.set(k, v);
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

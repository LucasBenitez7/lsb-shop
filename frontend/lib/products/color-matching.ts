/**
 * Color label matching for variants, gallery images, order snapshots, and SEO.
 * Keep synonym groups in sync with `backend/apps/products/color_matching.py`.
 */

const COLOR_SYNONYM_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ["red", "rojo", "rosso"],
  ["blue", "azul", "bleu"],
  ["green", "verde"],
  ["black", "negro", "noir"],
  ["white", "blanco", "blanc"],
  ["yellow", "amarillo", "jaune"],
  ["orange", "naranja", "arancione"],
  ["purple", "morado", "violet", "violeta", "lila"],
  ["pink", "rosa"],
  ["brown", "marrón", "marron"],
  ["gray", "grey", "gris"],
  ["beige"],
  ["navy", "marine", "marino"],
];

const CANONICAL_BY_TOKEN: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const group of COLOR_SYNONYM_GROUPS) {
    const sorted = [...group].sort();
    const canonical = sorted[0]!;
    for (const term of group) {
      m.set(term, canonical);
    }
  }
  return m;
})();

export function normalizeColorLabel(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value).trim().normalize("NFC").replace(/\s+/g, " ");
  return s.toLowerCase();
}

export function colorMatchKey(value: string | null | undefined): string {
  const n = normalizeColorLabel(value);
  if (!n) return "";
  return CANONICAL_BY_TOKEN.get(n) ?? n;
}

export function colorsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ka = colorMatchKey(a);
  const kb = colorMatchKey(b);
  return Boolean(ka && kb && ka === kb);
}

/** First image whose color matches `targetColor`, else first image in the list. */
export function findImageByColorOrFallback<
  T extends { color?: string | null },
>(images: T[], targetColor: string | null | undefined): T | undefined {
  if (!images.length) return undefined;
  const t = targetColor?.trim();
  if (t) {
    const matched = images.find((img) => colorsMatch(img.color, t));
    if (matched) return matched;
  }
  return images[0];
}

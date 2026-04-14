// --- TALLAS ---
export const CLOTHING_SIZES = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "2XL",
  "3XL",
  "4XL",
  "Única",
];
export const SHOE_SIZES = [
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
];

// --- COLORES ---
export const PRODUCT_COLORS = [
  { name: "Negro", hex: "#171717" },
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Azul Marino", hex: "#1e3a8a" },
  { name: "Beige", hex: "#d6c0a1" },
  { name: "Rojo", hex: "#dc2626" },
  { name: "Verde", hex: "#15803d" },
  { name: "Gris", hex: "#6b7280" },
  { name: "Naranja", hex: "#f97316" },
  { name: "Morado", hex: "#8b5cf6" },
  { name: "Amarillo", hex: "#fcd34d" },
  { name: "Azul", hex: "#3b82f6" },
  { name: "Gris Oscuro", hex: "#4b5563" },
  { name: "Marrón", hex: "#332000" },
  { name: "Default", hex: "#e5e5e5" },
] as const;

export const COLOR_MAP: Record<string, string> = PRODUCT_COLORS.reduce(
  (acc, color) => ({ ...acc, [color.name]: color.hex }),
  { Default: "#e5e5e5" },
);

// --- CATEGORÍAS INICIALES ---
export const INITIAL_CATEGORIES = [
  { slug: "chaquetas", name: "Chaquetas" },
  { slug: "pantalones", name: "Pantalones" },
  { slug: "jeans", name: "Jeans" },
  { slug: "jerseys", name: "Jerseys" },
  { slug: "camisetas", name: "Camisetas" },
] as const;

// --- SORTING (PÚBLICO) ---
export const PUBLIC_SORT_OPTIONS = [
  { label: "Precio (menor a mayor)", value: "price_asc" },
  { label: "Precio (mayor a menor)", value: "price_desc" },
] as const;

// --- SORTING (ADMIN) — incluye opciones que solo el dashboard soporta ---
export const ADMIN_SORT_OPTIONS = [
  { label: "Más recientes", value: "date_desc" },
  { label: "Más antiguos", value: "date_asc" },
  { label: "Orden numérico", value: "order_asc" },
  { label: "Más vendidos", value: "sales_desc" },
  { label: "Menos vendidos", value: "sales_asc" },
  { label: "Nombre ascendente", value: "name_asc" },
  { label: "Nombre descendente", value: "name_desc" },
  { label: "Precio (menor a mayor)", value: "price_asc" },
  { label: "Precio (mayor a menor)", value: "price_desc" },
  { label: "Stock (mayor a menor)", value: "stock_desc" },
  { label: "Stock (menor a mayor)", value: "stock_asc" },
] as const;

/** @deprecated Usar PUBLIC_SORT_OPTIONS o ADMIN_SORT_OPTIONS */
export const PRODUCT_SORT_OPTIONS = ADMIN_SORT_OPTIONS;

export const DEFAULT_SORT = "date_desc";

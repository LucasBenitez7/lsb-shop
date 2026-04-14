import { describe, it, expect, vi } from "vitest";

import {
  capitalize,
  compareSizes,
  sortSizes,
  sortVariantsHelper,
  findVariant,
  getUniqueColors,
  getUniqueSizes,
  normalizeImages,
  getImageForColor,
  parseSort,
  parseSearchParamFilters,
  toggleArrayParam,
  setQueryParam,
  centsToEuros,
  eurosToCents,
  filterByWordMatch,
  getInitialProductState,
} from "@/lib/products/utils";

// ─── capitalize ───────────────────────────────────────────────────────────────
describe("capitalize", () => {
  it("capitaliza la primera letra y pasa el resto a minúsculas", () => {
    expect(capitalize("hola")).toBe("Hola");
    expect(capitalize("MUNDO")).toBe("Mundo");
    expect(capitalize("hOLa MuNdO")).toBe("Hola mundo");
  });

  it("devuelve string vacío si recibe string vacío", () => {
    expect(capitalize("")).toBe("");
  });
});

// ─── compareSizes ─────────────────────────────────────────────────────────────
describe("compareSizes", () => {
  it("ordena tallas de ropa por índice (S antes que M antes que L)", () => {
    expect(compareSizes("S", "M")).toBeLessThan(0);
    expect(compareSizes("M", "S")).toBeGreaterThan(0);
    expect(compareSizes("M", "M")).toBe(0);
  });

  it("ordena tallas extendidas correctamente (XS antes que XL, 2XL al final)", () => {
    expect(compareSizes("XS", "XL")).toBeLessThan(0);
    expect(compareSizes("XXL", "2XL")).toBeLessThan(0);
    expect(compareSizes("3XL", "4XL")).toBeLessThan(0);
  });

  it("ordena tallas numéricas correctamente", () => {
    expect(compareSizes("38", "40")).toBeLessThan(0);
    expect(compareSizes("42", "38")).toBeGreaterThan(0);
  });

  it("ordena tallas numéricas con coma decimal", () => {
    expect(compareSizes("38,5", "39")).toBeLessThan(0);
  });

  it("cae a localeCompare para strings no reconocidos", () => {
    const result = compareSizes("abc", "xyz");
    expect(typeof result).toBe("number");
  });
});

// ─── sortSizes ────────────────────────────────────────────────────────────────
describe("sortSizes", () => {
  it("ordena tallas de ropa correctamente", () => {
    expect(sortSizes(["XL", "S", "M", "L", "XS"])).toEqual([
      "XS",
      "S",
      "M",
      "L",
      "XL",
    ]);
  });

  it("ordena tallas extendidas correctamente", () => {
    expect(sortSizes(["4XL", "XXL", "2XL", "3XL"])).toEqual([
      "XXL",
      "2XL",
      "3XL",
      "4XL",
    ]);
  });

  it("no muta el array original", () => {
    const original = ["L", "S", "M"];
    sortSizes(original);
    expect(original).toEqual(["L", "S", "M"]);
  });

  it("ordena tallas numéricas", () => {
    expect(sortSizes(["42", "38", "40"])).toEqual(["38", "40", "42"]);
  });
});

// ─── sortVariantsHelper ───────────────────────────────────────────────────────
describe("sortVariantsHelper", () => {
  const variants = [
    { color: "Rojo", size: "L", colorOrder: 1 },
    { color: "Azul", size: "M", colorOrder: 2 },
    { color: "Rojo", size: "S", colorOrder: 1 },
  ];

  it("ordena por colorOrder primero", () => {
    const sorted = sortVariantsHelper(variants);
    expect(sorted[0].color).toBe("Rojo");
    expect(sorted[2].color).toBe("Azul");
  });

  it("dentro del mismo color ordena por talla", () => {
    const sorted = sortVariantsHelper(variants);
    const rojos = sorted.filter((v) => v.color === "Rojo");
    expect(rojos[0].size).toBe("S");
    expect(rojos[1].size).toBe("L");
  });

  it("no muta el array original", () => {
    const original = [...variants];
    sortVariantsHelper(variants);
    expect(variants).toEqual(original);
  });
});

// ─── findVariant ──────────────────────────────────────────────────────────────
describe("findVariant", () => {
  const variants = [
    {
      id: "1",
      color: "Rojo",
      size: "M",
      stock: 5,
      colorOrder: 1,
      isActive: true,
      colorHex: "#ff0000",
    },
    {
      id: "2",
      color: "Azul",
      size: "L",
      stock: 3,
      colorOrder: 2,
      isActive: true,
      colorHex: "#0000ff",
    },
  ];

  it("encuentra la variante correcta por color y talla", () => {
    expect(findVariant(variants, "Rojo", "M")?.id).toBe("1");
    expect(findVariant(variants, "Azul", "L")?.id).toBe("2");
  });

  it("devuelve undefined si no encuentra la variante", () => {
    expect(findVariant(variants, "Verde", "M")).toBeUndefined();
    expect(findVariant(variants, "Rojo", "XL")).toBeUndefined();
  });

  it("devuelve undefined si color o size son null", () => {
    expect(findVariant(variants, null, "M")).toBeUndefined();
    expect(findVariant(variants, "Rojo", null)).toBeUndefined();
  });
});

// ─── getUniqueColors ──────────────────────────────────────────────────────────
describe("getUniqueColors", () => {
  it("devuelve colores únicos manteniendo el orden de aparición", () => {
    const variants = [
      {
        id: "1",
        color: "Rojo",
        size: "M",
        stock: 5,
        colorOrder: 1,
        isActive: true,
        colorHex: "#ff0000",
      },
      {
        id: "2",
        color: "Rojo",
        size: "L",
        stock: 3,
        colorOrder: 1,
        isActive: true,
        colorHex: "#ff0000",
      },
      {
        id: "3",
        color: "Azul",
        size: "M",
        stock: 2,
        colorOrder: 2,
        isActive: true,
        colorHex: "#0000ff",
      },
    ];
    expect(getUniqueColors(variants)).toEqual(["Rojo", "Azul"]);
  });

  it("devuelve array vacío para variants vacías", () => {
    expect(getUniqueColors([])).toEqual([]);
  });
});

// ─── getUniqueSizes ───────────────────────────────────────────────────────────
describe("getUniqueSizes", () => {
  it("devuelve tallas únicas ordenadas", () => {
    const variants = [
      {
        id: "1",
        color: "Rojo",
        size: "L",
        stock: 5,
        colorOrder: 1,
        isActive: true,
        colorHex: "#ff0000",
      },
      {
        id: "2",
        color: "Rojo",
        size: "S",
        stock: 3,
        colorOrder: 1,
        isActive: true,
        colorHex: "#ff0000",
      },
      {
        id: "3",
        color: "Azul",
        size: "M",
        stock: 2,
        colorOrder: 2,
        isActive: true,
        colorHex: "#0000ff",
      },
      {
        id: "4",
        color: "Azul",
        size: "S",
        stock: 1,
        colorOrder: 2,
        isActive: true,
        colorHex: "#0000ff",
      },
    ];
    expect(getUniqueSizes(variants)).toEqual(["S", "M", "L"]);
  });
});

// ─── normalizeImages ──────────────────────────────────────────────────────────
describe("normalizeImages", () => {
  it("devuelve imagen por defecto si el array está vacío", () => {
    const result = normalizeImages("Camiseta", []);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("/og/default-products.jpg");
    expect(result[0].alt).toBe("Camiseta");
  });

  it("usa el productName como alt cuando alt es null", () => {
    const images = [
      {
        url: "https://res.cloudinary.com/demo/img.jpg",
        alt: null,
        sort: 0,
        color: "Rojo",
      },
    ];
    const result = normalizeImages("Camiseta", images);
    expect(result[0].alt).toBe("Camiseta");
    expect(result[0].color).toBe("Rojo");
  });

  it("usa alt de la imagen si existe", () => {
    const images = [
      {
        url: "https://res.cloudinary.com/demo/img.jpg",
        alt: "Mi imagen",
        sort: 0,
        color: null,
      },
    ];
    const result = normalizeImages("Camiseta", images);
    expect(result[0].alt).toBe("Mi imagen");
  });
});

// ─── getImageForColor ─────────────────────────────────────────────────────────
describe("getImageForColor", () => {
  const images = [
    { url: "https://example.com/rojo.jpg", color: "Rojo" },
    { url: "https://example.com/azul.jpg", color: "Azul" },
  ];

  it("devuelve la imagen del color seleccionado", () => {
    expect(getImageForColor(images, "Rojo")).toBe(
      "https://example.com/rojo.jpg",
    );
    expect(getImageForColor(images, "Azul")).toBe(
      "https://example.com/azul.jpg",
    );
  });

  it("devuelve la primera imagen si no hay match de color", () => {
    expect(getImageForColor(images, "Verde")).toBe(
      "https://example.com/rojo.jpg",
    );
  });

  it("devuelve la primera imagen si color es null", () => {
    expect(getImageForColor(images, null)).toBe("https://example.com/rojo.jpg");
  });

  it("devuelve fallback si el array está vacío", () => {
    expect(getImageForColor([], "Rojo")).toBe("/og/default-products.jpg");
  });
});

// ─── parseSort ────────────────────────────────────────────────────────────────
describe("parseSort", () => {
  it("devuelve string de query param para precio ascendente", () => {
    expect(parseSort("price_asc")).toBe("price_asc");
  });

  it("devuelve string de query param para precio descendente", () => {
    expect(parseSort("price_desc")).toBe("price_desc");
  });

  it("devuelve string de query param para nombre ascendente", () => {
    expect(parseSort("name_asc")).toBe("name_asc");
  });

  it("devuelve string de query param para fecha descendente", () => {
    expect(parseSort("date_desc")).toBe("date_desc");
  });

  it("devuelve orden por defecto para valor desconocido", () => {
    expect(parseSort("unknown")).toBe("sort_asc,date_desc");
  });

  it("devuelve orden por defecto para undefined", () => {
    expect(parseSort(undefined)).toBe("sort_asc,date_desc");
  });
});

// ─── parseSearchParamFilters ──────────────────────────────────────────────────
describe("parseSearchParamFilters", () => {
  it("parsea sizes como array cuando es string", () => {
    expect(parseSearchParamFilters({ sizes: "M" }).sizes).toEqual(["M"]);
  });

  it("parsea sizes cuando ya es array", () => {
    expect(parseSearchParamFilters({ sizes: ["S", "M"] }).sizes).toEqual([
      "S",
      "M",
    ]);
  });

  it("parsea minPrice y maxPrice como números", () => {
    const result = parseSearchParamFilters({ minPrice: "10", maxPrice: "50" });
    expect(result.minPrice).toBe(10);
    expect(result.maxPrice).toBe(50);
  });

  it("deja undefined si no hay filtros", () => {
    const result = parseSearchParamFilters({});
    expect(result.sizes).toBeUndefined();
    expect(result.colors).toBeUndefined();
    expect(result.minPrice).toBeUndefined();
  });

  it("parsea sort correctamente", () => {
    expect(parseSearchParamFilters({ sort: "price_asc" }).sort).toBe(
      "price_asc",
    );
  });
});

// ─── toggleArrayParam ─────────────────────────────────────────────────────────
describe("toggleArrayParam", () => {
  it("añade valor si no existe", () => {
    const result = toggleArrayParam(new URLSearchParams(), "sizes", "M");
    expect(result.getAll("sizes")).toContain("M");
  });

  it("elimina valor si ya existe", () => {
    const result = toggleArrayParam(
      new URLSearchParams("sizes=M&sizes=L"),
      "sizes",
      "M",
    );
    expect(result.getAll("sizes")).not.toContain("M");
    expect(result.getAll("sizes")).toContain("L");
  });

  it("no muta los searchParams originales", () => {
    const params = new URLSearchParams("sizes=M");
    toggleArrayParam(params, "sizes", "M");
    expect(params.getAll("sizes")).toContain("M");
  });
});

// ─── setQueryParam ────────────────────────────────────────────────────────────
describe("setQueryParam", () => {
  it("añade el parámetro si no existe", () => {
    expect(setQueryParam(new URLSearchParams(), "page", "2").get("page")).toBe(
      "2",
    );
  });

  it("reemplaza el valor si ya existe", () => {
    expect(
      setQueryParam(new URLSearchParams("page=1"), "page", "3").get("page"),
    ).toBe("3");
  });
});

// ─── centsToEuros / eurosToCents ─────────────────────────────────────────────
describe("centsToEuros y eurosToCents", () => {
  it("convierte céntimos a euros", () => {
    expect(centsToEuros(1999)).toBe(19.99);
    expect(centsToEuros(100)).toBe(1);
  });

  it("convierte euros a céntimos", () => {
    expect(eurosToCents(19.99)).toBe(1999);
    expect(eurosToCents(1)).toBe(100);
  });

  it("son inversas entre sí", () => {
    expect(eurosToCents(centsToEuros(1999))).toBe(1999);
  });
});

// ─── filterByWordMatch ────────────────────────────────────────────────────────
describe("filterByWordMatch", () => {
  const items = [
    { name: "Camiseta roja", category: "ropa" },
    { name: "Pantalón azul", category: "ropa" },
    { name: "Zapatillas deportivas", category: "calzado" },
  ];
  const getFields = (item: (typeof items)[0]) => [item.name, item.category];

  it("filtra correctamente por palabra", () => {
    const result = filterByWordMatch(items, "camiseta", getFields);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Camiseta roja");
  });

  it("devuelve todos si query está vacío", () => {
    expect(filterByWordMatch(items, "", getFields)).toHaveLength(3);
    expect(filterByWordMatch(items, "   ", getFields)).toHaveLength(3);
  });

  it("filtra por múltiples palabras (AND)", () => {
    expect(
      filterByWordMatch(items, "zapatillas deportivas", getFields),
    ).toHaveLength(1);
  });

  it("es case-insensitive", () => {
    expect(filterByWordMatch(items, "CAMISETA", getFields)).toHaveLength(1);
  });

  it("devuelve array vacío si no hay coincidencias", () => {
    expect(filterByWordMatch(items, "vestido", getFields)).toHaveLength(0);
  });

  it("maneja plural/singular (camiseta → camisetas)", () => {
    expect(filterByWordMatch(items, "camisetas", getFields)).toHaveLength(1);
  });
});

// ─── getInitialProductState ───────────────────────────────────────────────────
describe("getInitialProductState", () => {
  const makeProduct = (variants: any[], images: any[] = []) => ({
    images,
    variants,
  });

  it("usa el colorParam si existe en las variantes", () => {
    const product = makeProduct([
      {
        color: "Rojo",
        size: "M",
        stock: 5,
        colorOrder: 0,
        isActive: true,
        colorHex: null,
      },
      {
        color: "Azul",
        size: "M",
        stock: 3,
        colorOrder: 1,
        isActive: true,
        colorHex: null,
      },
    ]);

    const { initialColor } = getInitialProductState(product as any, "Azul");
    expect(initialColor).toBe("Azul");
  });

  it("ignora colorParam si no existe en las variantes y usa el primer color con stock", () => {
    const product = makeProduct([
      {
        color: "Rojo",
        size: "M",
        stock: 5,
        colorOrder: 0,
        isActive: true,
        colorHex: null,
      },
    ]);

    const { initialColor } = getInitialProductState(product as any, "Verde");
    expect(initialColor).toBe("Rojo");
  });

  it("initialColor es null si no hay variantes con stock", () => {
    const product = makeProduct([
      {
        color: "Rojo",
        size: "M",
        stock: 0,
        colorOrder: 0,
        isActive: true,
        colorHex: null,
      },
    ]);

    const { initialColor } = getInitialProductState(product as any);
    expect(initialColor).toBeNull();
  });

  it("initialImage usa la imagen que coincide con initialColor", () => {
    const product = makeProduct(
      [
        {
          color: "Azul",
          size: "M",
          stock: 3,
          colorOrder: 0,
          isActive: true,
          colorHex: null,
        },
      ],
      [
        { url: "rojo.jpg", color: "Rojo", alt: null, sort: 0 },
        { url: "azul.jpg", color: "Azul", alt: null, sort: 1 },
      ],
    );

    const { initialImage } = getInitialProductState(product as any, "Azul");
    expect(initialImage).toBe("azul.jpg");
  });

  it("initialImage usa la primera imagen si no hay match por color", () => {
    const product = makeProduct(
      [
        {
          color: "Verde",
          size: "M",
          stock: 3,
          colorOrder: 0,
          isActive: true,
          colorHex: null,
        },
      ],
      [{ url: "primera.jpg", color: "Rojo", alt: null, sort: 0 }],
    );

    const { initialImage } = getInitialProductState(product as any, "Verde");
    expect(initialImage).toBe("primera.jpg");
  });

  it("sin colorParam elige el primer color con stock ordenado por colorOrder", () => {
    const product = makeProduct([
      {
        color: "Azul",
        size: "M",
        stock: 2,
        colorOrder: 1,
        isActive: true,
        colorHex: null,
      },
      {
        color: "Rojo",
        size: "M",
        stock: 5,
        colorOrder: 0,
        isActive: true,
        colorHex: null,
      },
    ]);

    const { initialColor } = getInitialProductState(product as any);
    expect(initialColor).toBe("Rojo"); // colorOrder 0 va primero
  });
});

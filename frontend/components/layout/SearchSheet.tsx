"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { IoClose } from "react-icons/io5";

import { ProductGrid } from "@/features/catalog/components/ProductGrid";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

import { formatDisplayName } from "@/lib/format-display-name";

import { useDebounce } from "@/hooks/common/use-debounce";

import type { PublicProductListItem } from "@/lib/products/types";

interface SearchSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SearchSheet({
  open: controlledOpen,
  onOpenChange,
}: SearchSheetProps = {}) {
  const [query, setQuery] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    setInternalOpen(val);
    onOpenChange?.(val);
  };
  const [results, setResults] = useState<PublicProductListItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setSuggestions([]);
      setTotal(0);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=6`,
        );
        const raw = await res.text();
        if (!res.ok) {
          setResults([]);
          setSuggestions([]);
          setTotal(0);
          return;
        }
        let data: {
          products?: PublicProductListItem[];
          suggestions?: string[];
          total?: number;
        };
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          setResults([]);
          setSuggestions([]);
          setTotal(0);
          return;
        }
        setResults(data.products || []);
        setSuggestions(data.suggestions || []);
        setTotal(data.total || 0);
      } catch (error) {
        console.error("Error fetching search results:", error);
        setResults([]);
        setSuggestions([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  const handleViewAll = () => {
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const clearInput = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-neutral-100 rounded-xs transition-colors hover:cursor-pointer tip-bottom"
        data-tip="Buscar"
        aria-label="Buscar"
        title="Buscar"
      >
        <HiOutlineSearch className="size-6" />
      </button>

      {/* Sheet from Top */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="top"
          className="h-full max-h-[100dvh] w-full p-0 overflow-hidden z-[200] gap-2"
        >
          {/* Hidden title for accessibility */}
          <VisuallyHidden>
            <SheetTitle>Búsqueda de productos</SheetTitle>
          </VisuallyHidden>

          {/* Header: Logo + Close */}
          <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto] items-center gap-0 sm:gap-6 px-4 sm:px-6 h-[var(--header-h)] bg-white sticky top-0 z-10">
            <div className="flex">
              <Link
                href="/"
                className="text-3xl font-semibold tracking-tight"
                onClick={() => setIsOpen(false)}
              >
                Logo lsb
              </Link>{" "}
            </div>

            <form
              onSubmit={handleSubmit}
              className="hidden sm:block justify-self-center w-full"
            >
              <div className="flex w-full md:w-[calc(100%-10rem)] lg:w-[calc(100%-16rem)] mx-auto border-b border-foreground items-center gap-0">
                <HiOutlineSearch className="size-5 text-foreground pointer-events-none mr-3" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar productos"
                  className="w-full flex-1 text-base sm:text-sm font-medium h-11 outline-none ring-none mr-3"
                  autoFocus
                />

                {/* Clear button */}
                {query && (
                  <Button
                    type="button"
                    onClick={clearInput}
                    variant="ghost"
                    className="text-sm py-2"
                    aria-label="Borrar"
                  >
                    Borrar
                  </Button>
                )}

                <div className="flex items-center">
                  {total > results.length && (
                    <Button
                      onClick={handleViewAll}
                      className="text-sm py-2 ml-3"
                      variant="default"
                    >
                      Ver todos ({total})
                    </Button>
                  )}
                </div>
              </div>
            </form>

            <div className="justify-self-end items-center">
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-xs transition-colors hover:cursor-pointer"
                aria-label="Cerrar"
              >
                <IoClose className="size-6" />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="block sm:hidden justify-self-center w-full px-4 pr-7"
          >
            <div className="flex w-full mx-auto border-b border-foreground items-center gap-0">
              <HiOutlineSearch className="size-5 text-foreground pointer-events-none mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar productos"
                className="w-full flex-1 text-base sm:text-sm font-medium h-11 outline-none ring-none mr-3"
                autoFocus
              />

              {/* Clear button */}
              {query && (
                <Button
                  type="button"
                  onClick={clearInput}
                  variant="ghost"
                  className="text-sm py-2"
                  aria-label="Borrar"
                >
                  Borrar
                </Button>
              )}

              <div className="flex items-center">
                {total > results.length && (
                  <Button
                    onClick={handleViewAll}
                    className="text-sm py-2 ml-3"
                    variant="default"
                  >
                    Ver todos ({total})
                  </Button>
                )}
              </div>
            </div>
          </form>

          {/* Results */}
          <div className="h-full overflow-y-auto px-0 pb-6">
            {!query.trim() ? (
              <div className="text-center text-foreground py-12 max-w-md mx-auto">
                <p className="text-xl font-medium mb-2">¿Qué estás buscando?</p>
                <p className="text-sm">
                  Escribe para buscar productos por nombre
                </p>
              </div>
            ) : (
              <div className="space-y-0 w-full mx-auto">
                {/* Sugerencias + Ver todos en misma fila */}
                {(suggestions.length > 0 || total > 0) && (
                  <div className="px-6 flex flex-col gap-4 sm:flex-row items-start sm:items-center justify-between py-4">
                    {suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={`${suggestion}-${idx}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-3 py-1 text-sm bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors"
                          >
                            {formatDisplayName(suggestion)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Productos usando ProductGrid */}
                {results.length > 0 && (
                  <div>
                    <ProductGrid
                      items={results}
                      shortenTitle
                      onProductClick={() => setIsOpen(false)}
                    />
                  </div>
                )}

                {/* No results */}
                {!loading && query.trim() && results.length === 0 && (
                  <div className="text-center py-12 text-foreground max-w-md mx-auto">
                    <p className="text-xl font-medium mb-2">
                      No se encontraron productos
                    </p>
                    <p className="text-sm">
                      Intenta con otros términos de búsqueda
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

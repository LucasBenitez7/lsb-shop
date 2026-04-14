"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";

import { Input } from "@/components/ui/input";

import { cn } from "@/lib/utils";

type SearchInputProps = {
  placeholder?: string;
  className?: string;
  paramName?: string;
};

export function SearchInput({
  placeholder = "Buscar...",
  className,
  paramName = "q",
}: SearchInputProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [term, setTerm] = useState(
    searchParams.get(paramName)?.toString() || "",
  );

  useEffect(() => {
    setTerm(searchParams.get(paramName)?.toString() || "");
  }, [searchParams, paramName]);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");

    if (term.trim()) {
      params.set(paramName, term.trim());
    } else {
      params.delete(paramName);
    }

    replace(`${pathname}?${params.toString()}`);
  };

  const clearSearch = () => {
    setTerm("");
    const params = new URLSearchParams(searchParams);
    params.delete(paramName);
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={cn("w-full relative flex items-center", className)}>
      <Input
        type="search"
        placeholder={placeholder}
        className="pr-20 h-9 bg-white"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
      />

      <div className="absolute right-0 top-0 h-full flex items-center">
        {term && (
          <button
            type="button"
            onClick={clearSearch}
            className="p-2 transition-colors mr-1"
            aria-label="Borrar búsqueda"
          >
            <FaXmark className="size-4 text-muted-foreground hover:text-foreground hover:cursor-pointer" />
          </button>
        )}

        <button
          type="button"
          onClick={handleSearch}
          className="bg-foreground text-background w-12 h-full flex items-center justify-center hover:bg-foreground/80 transition-colors rounded-r-xs hover:cursor-pointer"
          title="Buscar"
        >
          <FaSearch className="size-4" />
        </button>
      </div>
    </div>
  );
}

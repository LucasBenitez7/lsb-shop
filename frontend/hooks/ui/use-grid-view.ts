"use client";

import { useEffect, useState } from "react";

type GridSize = 1 | 2 | 4;

interface GridViewState {
  mobile: GridSize;
  desktop: GridSize;
}

const STORAGE_KEY = "acme-grid-view-preference";

const DEFAULT_GRID_VIEW: GridViewState = {
  mobile: 1,
  desktop: 4,
};

export function useGridView(resetKey?: string) {
  const [gridView, setGridView] = useState<GridViewState>(DEFAULT_GRID_VIEW);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GridViewState;
        setGridView(parsed);
      }
    } catch (error) {
      console.error("Failed to load grid view preference:", error);
    }
  }, []);

  // Reset to defaults when resetKey changes (e.g., different category/page)
  useEffect(() => {
    if (isMounted && resetKey) {
      setGridView(DEFAULT_GRID_VIEW);
    }
  }, [resetKey, isMounted]);

  // Save to localStorage when gridView changes
  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gridView));
      } catch (error) {
        console.error("Failed to save grid view preference:", error);
      }
    }
  }, [gridView, isMounted]);

  const setMobileView = (size: GridSize) => {
    setGridView((prev) => ({ ...prev, mobile: size }));
  };

  const setDesktopView = (size: GridSize) => {
    setGridView((prev) => ({ ...prev, desktop: size }));
  };

  return {
    gridView,
    setMobileView,
    setDesktopView,
    isMounted,
  };
}

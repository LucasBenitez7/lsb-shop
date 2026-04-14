import { create } from "zustand";

type ProductPreferencesState = {
  selectedColors: Record<string, string>;

  setProductColor: (slug: string, color: string) => void;
};

export const useProductPreferences = create<ProductPreferencesState>((set) => ({
  selectedColors: {},
  setProductColor: (slug, color) =>
    set((state) => ({
      selectedColors: {
        ...state.selectedColors,
        [slug]: color,
      },
    })),
}));

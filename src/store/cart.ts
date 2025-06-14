
import { create } from "zustand";
import { Product } from "@/types";

interface CartState {
  items: Product[];
  addToCart: (product: Product) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addToCart: (product) => {
    set((state) => ({
      items: [...state.items, product],
    }));
  },
}));

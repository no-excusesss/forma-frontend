"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DiscoveryProduct {
  id: number;
  title: string;
  slug: string;
  price: string;
  discountPrice: string | null;
  currency: string;
  images: { url: string }[];
  seller: { displayName: string; slug: string };
}
export interface DiscoveryCategory {
  id: number;
  name: string;
  slug: string;
  productCount: number;
  products: DiscoveryProduct[];
}
export function useDiscovery() {
  return useQuery({
    queryKey: ["discovery"],
    queryFn: ({ signal }) =>
      api<DiscoveryCategory[]>("/products/discovery", { signal }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

"use client";
import { useSyncExternalStore } from "react";
import type { Product } from "./contracts";
const key = "forma-device-bag-v1";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("forma-bag", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("forma-bag", callback);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(key) || "[]";
  } catch {
    return "[]";
  }
}
export function parseBag(value: string): number[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? [
          ...new Set(
            parsed.filter(
              (id): id is number =>
                typeof id === "number" && Number.isSafeInteger(id) && id > 0,
            ),
          ),
        ].slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
export function useBag() {
  const stored = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const ids = parseBag(stored);
  function write(next: number[]) {
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event("forma-bag"));
  }
  return {
    ids,
    add: (p: Pick<Product, "id">) =>
      write([...new Set([...parseBag(snapshot()), p.id])].slice(0, 100)),
    remove: (id: number) => write(parseBag(snapshot()).filter((v) => v !== id)),
    removePurchased: (purchased: number[]) =>
      write(parseBag(snapshot()).filter((id) => !purchased.includes(id))),
  };
}

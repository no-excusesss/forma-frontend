"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useUnsavedChanges(dirty: boolean, onDiscard: () => void) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    function navigate(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (
        url.origin !== location.origin ||
        (url.pathname === location.pathname && url.search === location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  return {
    pendingHref,
    cancelLeave: () => setPendingHref(null),
    confirmLeave: () => {
      if (pendingHref) {
        onDiscard();
        router.push(pendingHref);
      }
      setPendingHref(null);
    },
  };
}

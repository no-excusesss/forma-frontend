"use client";
import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Skeleton } from "./ui";

export function GlobalActivity() {
  const count = useIsFetching() + useIsMutating();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(count > 0), 250);
    return () => clearTimeout(timer);
  }, [count]);
  return visible ? (
    <div
      className="global-activity"
      role="progressbar"
      aria-label="Loading content"
    >
      <span />
    </div>
  ) : null;
}
export function PageLoading() {
  return (
    <div
      className="container section route-loading"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading your page</span>
      <div className="route-loading-heading" aria-hidden="true">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
      </div>
      <Skeleton cards={4} />
    </div>
  );
}

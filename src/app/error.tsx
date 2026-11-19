"use client";
import { ErrorState } from "@/components/ui";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="container section">
      <ErrorState
        error={new Error("This page couldn’t load. Please try again.")}
        retry={reset}
      />
      <span className="sr-only">{error.name}</span>
    </div>
  );
}

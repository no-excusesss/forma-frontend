import { Suspense } from "react";
import { BrowseCatalog } from "@/features/catalog/browse";
import { Loading } from "@/components/ui";
export const metadata = { title: "New arrivals" };
export default function NewArrivals() {
  return (
    <Suspense fallback={<Loading label="Finding the latest arrivals" />}>
      <BrowseCatalog arrivals />
    </Suspense>
  );
}

import { Suspense } from "react";
import { BrowseCatalog } from "@/features/catalog/browse";
import { Loading } from "@/components/ui";
export const metadata = { title: "Discover" };
export default function Products() {
  return (
    <Suspense fallback={<Loading label="Finding your kind of good" />}>
      <BrowseCatalog />
    </Suspense>
  );
}

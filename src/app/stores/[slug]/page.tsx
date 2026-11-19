import { PublicStore } from "@/features/sellers/sellers";
export const metadata = { title: "Independent store" };
export default async function Store({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  return (
    <div className="container section">
      <PublicStore
        slug={slug}
        initialTab={query.tab === "reviews" ? "reviews" : "products"}
      />
    </div>
  );
}

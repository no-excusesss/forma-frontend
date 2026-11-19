import { ProductDetail } from "@/features/catalog/product-detail";
export const metadata = { title: "Product details" };
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="container section">
      <ProductDetail slug={slug} />
    </div>
  );
}

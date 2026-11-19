import { notFound } from "next/navigation";
import { AccountShell } from "@/components/protected";
import { ProductEditor } from "@/features/listings/product-editor";
export const metadata = { title: "Edit product" };
export default async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const number = Number(id);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  return (
    <div className="container section">
      <AccountShell seller>
        <ProductEditor id={number} />
      </AccountShell>
    </div>
  );
}

import { AccountShell } from "@/components/protected";
import { ProductEditor } from "@/features/listings/product-editor";
export const metadata = { title: "New product" };
export default function NewProduct() {
  return (
    <div className="container section">
      <AccountShell seller>
        <ProductEditor />
      </AccountShell>
    </div>
  );
}

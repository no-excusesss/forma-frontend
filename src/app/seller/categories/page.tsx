import { AccountShell } from "@/components/protected";
import { CategorySettings } from "@/features/categories/category-settings";
export const metadata = { title: "Product categories" };
export default function SellerCategoriesPage() {
  return (
    <div className="container section">
      <AccountShell seller>
        <CategorySettings />
      </AccountShell>
    </div>
  );
}

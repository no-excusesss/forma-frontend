import { Protected } from "@/components/protected";
import { CategorySettings } from "@/features/categories/category-settings";
export const metadata = { title: "Product category settings" };
export default function CategoriesPage() {
  return (
    <div className="container section">
      <Protected>
        <div className="settings-content">
          <CategorySettings />
        </div>
      </Protected>
    </div>
  );
}

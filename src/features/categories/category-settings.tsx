"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Category } from "@/lib/contracts";
import { EmptyState, ErrorState, Loading, PageIntro } from "@/components/ui";
import { CategoryCreateForm } from "./category-create";

export function CategorySettings() {
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => api<Category[]>("/product-categories", { signal }),
  });
  return (
    <>
      <PageIntro
        eyebrow="PRODUCT ORGANIZATION"
        title="Categories"
        description="Organize your products so shoppers can find what they’re looking for."
        action={
          <Link className="text-link" href="/seller/products/new">
            Back to product creation ↗
          </Link>
        }
      />
      <section className="panel">
        <h2>Create a category</h2>
        <CategoryCreateForm />
      </section>
      <section className="panel">
        <h2>Available categories</h2>
        {categories.isPending ? (
          <Loading />
        ) : categories.error ? (
          <ErrorState
            error={categories.error}
            retry={() => {
              void categories.refetch();
            }}
          />
        ) : categories.data.length ? (
          <ul className="category-list">
            {categories.data.map((category) => (
              <li key={category.id}>
                <span>{category.name}</span>
                <span className="muted">{category.slug}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No categories yet."
            description="Create your first category above, or add one while creating a product."
          />
        )}
      </section>
    </>
  );
}

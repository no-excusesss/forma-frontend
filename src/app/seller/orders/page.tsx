import { AccountShell } from "@/components/protected";
import { PageIntro } from "@/components/ui";
import { Orders } from "@/features/checkout/orders";
export const metadata = { title: "Store orders" };
export default function SellerOrdersPage() {
  return (
    <div className="container section">
      <AccountShell seller>
        <PageIntro
          eyebrow="SELLER STUDIO"
          title="Store orders."
          description="Confirmed test purchases from your store."
        />
        <Orders seller />
      </AccountShell>
    </div>
  );
}

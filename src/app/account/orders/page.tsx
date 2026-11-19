import { AccountShell } from "@/components/protected";
import { PageIntro } from "@/components/ui";
import { Orders } from "@/features/checkout/orders";
export const metadata = { title: "My orders" };
export default function OrdersPage() {
  return (
    <div className="container section">
      <AccountShell>
        <PageIntro
          eyebrow="YOUR PURCHASES"
          title="My orders."
          description="Every purchase, every detail. Follow your orders from payment to delivery."
        />
        <Orders />
      </AccountShell>
    </div>
  );
}

import { Protected } from "@/components/protected";
import { PageIntro } from "@/components/ui";
import { Checkout } from "@/features/checkout/checkout";
export const metadata = { title: "Test checkout" };
export default function CheckoutPage() {
  return (
    <div className="container section">
      <PageIntro
        eyebrow="ONE STEP CLOSER"
        title="Review your checkout."
        description="One payment for your saved finds, with a separate order for each store. NGN test cards only."
      />
      <Protected>
        <Checkout />
      </Protected>
    </div>
  );
}

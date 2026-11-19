import { AccountShell } from "@/components/protected";
import { OrderDetail } from "@/features/checkout/orders";
export const metadata = { title: "Order details" };
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="container section">
      <AccountShell>
        <OrderDetail id={id} />
      </AccountShell>
    </div>
  );
}

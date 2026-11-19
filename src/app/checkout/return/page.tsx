import { Protected } from "@/components/protected";
import { PaymentReturn } from "@/features/checkout/orders";
export const metadata = { title: "Payment confirmation" };
export default async function ReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string | string[] }>;
}) {
  const params = await searchParams;
  const reference =
    typeof params.reference === "string" &&
    /^forma-[a-f0-9-]{36}$/.test(params.reference)
      ? params.reference
      : "";
  return (
    <div className="container section">
      <Protected
        nextHref={`/checkout/return?reference=${encodeURIComponent(reference)}`}
      >
        <PaymentReturn reference={reference} />
      </Protected>
    </div>
  );
}

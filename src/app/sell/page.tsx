import { Protected } from "@/components/protected";
import { SellerForm } from "@/features/sellers/sellers";
export const metadata = { title: "Become a seller" };
export default function Sell() {
  return (
    <div className="container section">
      <Protected>
        <div style={{ maxWidth: 850, marginInline: "auto" }}>
          <SellerForm onboarding />
        </div>
      </Protected>
    </div>
  );
}

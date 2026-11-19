import { AccountShell } from "@/components/protected";
import { SellerDashboard } from "@/features/sellers/sellers";
export const metadata = { title: "Seller studio" };
export default function Seller() {
  return (
    <div className="container section">
      <AccountShell seller>
        <SellerDashboard />
      </AccountShell>
    </div>
  );
}

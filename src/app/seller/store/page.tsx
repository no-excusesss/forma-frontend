import { AccountShell } from "@/components/protected";
import { SellerForm } from "@/features/sellers/sellers";
export const metadata = { title: "Store settings" };
export default function StoreSettings() {
  return (
    <div className="container section">
      <AccountShell seller>
        <SellerForm />
      </AccountShell>
    </div>
  );
}

import { AccountShell } from "@/components/protected";
import { ProfileEditor } from "@/features/profiles/profile";
export const metadata = { title: "Your profile" };
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="container section">
      <AccountShell>
        <ProfileEditor checkout={params.checkout === "1"} />
      </AccountShell>
    </div>
  );
}

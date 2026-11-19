import { PublicPerson } from "@/features/profiles/profile";
export const metadata = { title: "Community profile" };
export default async function PersonPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return (
    <div className="container section">
      <PublicPerson username={username} />
    </div>
  );
}

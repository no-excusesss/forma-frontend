import { MyReviews } from "@/features/reviews/reviews";
import { AccountShell } from "@/components/protected";
import { PageIntro } from "@/components/ui";
export const metadata = { title: "My reviews" };
export default function ReviewsPage() {
  return (
    <div className="container section">
      <AccountShell>
        <PageIntro
          eyebrow="YOUR PERSPECTIVE"
          title="My reviews."
          description="Your experiences help someone else find their kind of good."
        />
        <MyReviews />
      </AccountShell>
    </div>
  );
}

import { Bag } from "@/features/catalog/bag";
import { PageIntro } from "@/components/ui";
export const metadata = { title: "Your bag" };
export default function Cart() {
  return (
    <div className="container section">
      <PageIntro
        eyebrow="A FEW FAVOURITES"
        title="Your saved bag."
        description="Your favourites, saved on this device. Revisit a product or explore its store."
      />
      <Bag />
    </div>
  );
}

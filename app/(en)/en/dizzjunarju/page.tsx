import { DizzjunarjuPage } from "@/components/dizzjunarju/DizzjunarjuPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("dizzjunarju", "en", "Dizzjunarju");

export default function Page() {
  return <DizzjunarjuPage lang="en" />;
}

import { GherqGame } from "@/components/gherq/GherqGame";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("gherq", "en", "Għerq");

export default function Page() {
  return <GherqGame lang="en" />;
}

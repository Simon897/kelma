import { GherqGame } from "@/components/gherq/GherqGame";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("gherq", "mt", "Għerq");

export default function Page() {
  return <GherqGame lang="mt" />;
}

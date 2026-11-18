import { FilGame } from "@/components/fil/FilGame";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("fil", "en", "Fil");

export default function Page() {
  return <FilGame lang="en" />;
}

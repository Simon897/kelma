import { HomePage } from "@/components/HomePage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("home", "mt");

export default function Page() {
  return <HomePage lang="mt" />;
}

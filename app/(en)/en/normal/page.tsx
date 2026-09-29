import { Game } from "@/components/Game";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("normali", "en", "Normal");

export default function Page() {
  return <Game lang="en" mode="normali" />;
}

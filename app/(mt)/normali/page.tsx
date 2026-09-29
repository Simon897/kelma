import { Game } from "@/components/Game";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("normali", "mt", "Normali");

export default function Page() {
  return <Game lang="mt" mode="normali" />;
}

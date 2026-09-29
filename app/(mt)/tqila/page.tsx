import { Game } from "@/components/Game";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("tqila", "mt", "Tqila");

export default function Page() {
  return <Game lang="mt" mode="tqila" />;
}

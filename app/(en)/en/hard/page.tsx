import { Game } from "@/components/Game";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("tqila", "en", "Hard");

export default function Page() {
  return <Game lang="en" mode="tqila" />;
}

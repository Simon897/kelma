import { SellumGame } from "@/components/sellum/SellumGame";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("sellum", "en", "Sellum");

export default function Page() {
  return <SellumGame lang="en" />;
}

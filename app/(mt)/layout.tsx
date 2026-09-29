import "../globals.css";
import { RootShell } from "@/components/RootShell";

export { viewport } from "@/lib/metadata";

export default function MalteseLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="mt">{children}</RootShell>;
}

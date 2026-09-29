import { HowPage } from "@/components/HowPage";
import { t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("how", "mt", t("mt").howTitle);

export default function Page() {
  return <HowPage lang="mt" />;
}

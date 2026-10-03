import { SellumHowPage } from "@/components/sellum/SellumHowPage";
import { t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("sellumHow", "en", t("en").sellumHowTitle);

export default function Page() {
  return <SellumHowPage lang="en" />;
}

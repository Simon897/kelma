import { GherqHowPage } from "@/components/gherq/GherqHowPage";
import { t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("gherqHow", "en", t("en").gherqHowTitle);

export default function Page() {
  return <GherqHowPage lang="en" />;
}

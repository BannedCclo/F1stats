import { useI18n } from "@/i18n/useI18n";

/**
 * The site's own slogan + data/asset credits — this is the free-form left
 * half of the shared Footer (see Footer.tsx), same text that used to live
 * inline in Layout.tsx's <footer>, just relocated into its own slot.
 */
export default function FooterCredits() {
  const { t } = useI18n();

  return (
    <div className="space-y-1 text-center font-data text-xs text-dim">
      <p>{t("brand.tagline")}</p>
      <p>
        Driver photos via{" "}
        <a
          href="https://www.wikipedia.org/"
          target="_blank"
          rel="noreferrer"
          className="hover:text-accent"
        >
          Wikipedia
        </a>
        — see each driver's Wikipedia page for the photographer credit and
        license
      </p>
      <p>
        Flags by{" "}
        <a
          href="https://github.com/lipis/flag-icons"
          target="_blank"
          rel="noreferrer"
          className="hover:text-accent"
        >
          lipis/flag-icons
        </a>
        , licensed MIT
      </p>
    </div>
  );
}

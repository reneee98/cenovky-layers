import { SettingsForm } from "@/app/settings/settings-form";
import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
import { getSettings } from "@/server/repositories";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const currentYear = new Date().getFullYear();

  return (
    <AppShell
      active="settings"
      title="Nastavenia"
      description="Firemne udaje, predvolby, DPH a cislovanie ponuk."
    >
      <SettingsForm
        currentYear={currentYear}
        canResetNumberingYear={settings.numberingYear !== currentYear}
        settings={{
          companyName: settings.companyName,
          companyAddress: settings.companyAddress,
          companyIco: settings.companyIco,
          companyDic: settings.companyDic,
          companyIcdph: settings.companyIcdph,
          companyEmail: settings.companyEmail,
          companyPhone: settings.companyPhone,
          companyWebsite: settings.companyWebsite,
          logoUrl: settings.logoUrl,
          defaultLanguage: settings.defaultLanguage,
          defaultCurrency: settings.defaultCurrency,
          vatRate: settings.vatRate.toString(),
          numberingYear: settings.numberingYear,
          numberingCounter: settings.numberingCounter,
        }}
      />
    </AppShell>
  );
}

import { SettingsForm } from "@/app/settings/settings-form";
import { AppShell } from "@/components/app-shell";
import { requireUserId } from "@/lib/auth";
import { runWithSupabaseAuth } from "@/lib/db";
import { getSettings } from "@/server/repositories";

export default async function SettingsPage() {
  const userId = await requireUserId();
  let settings;
  try {
    settings = await runWithSupabaseAuth(userId, (client) => getSettings(userId, client));
  } catch {
    settings = await getSettings(userId);
  }
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
          companyIban: settings.companyIban ?? null,
          companySwiftBic: settings.companySwiftBic ?? null,
          companyRegistrationNote: settings.companyRegistrationNote ?? null,
          logoUrl: settings.logoUrl,
          companySignatureUrl: settings.companySignatureUrl ?? null,
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

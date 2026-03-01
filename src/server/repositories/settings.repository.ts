import { Prisma, Settings } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ensureSettingsSingleton } from "@/server/db/init";
import { SETTINGS_SINGLETON_ID } from "@/server/db/settings-defaults";

export async function getSettings(): Promise<Settings> {
  return ensureSettingsSingleton();
}

export async function updateSettings(
  data: Prisma.SettingsUpdateInput,
): Promise<Settings> {
  await ensureSettingsSingleton();

  return prisma.settings.update({
    where: { id: SETTINGS_SINGLETON_ID },
    data,
  });
}

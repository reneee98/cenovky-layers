import { Settings } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  buildDefaultSettingsCreateInput,
  SETTINGS_SINGLETON_ID,
} from "@/server/db/settings-defaults";

export async function ensureSettingsSingleton(): Promise<Settings> {
  const existing = await prisma.settings.findUnique({
    where: { id: SETTINGS_SINGLETON_ID },
  });

  if (existing) {
    return existing;
  }

  return prisma.settings.create({
    data: buildDefaultSettingsCreateInput(),
  });
}

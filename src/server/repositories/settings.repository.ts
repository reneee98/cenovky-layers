import type { Prisma } from "@/types/prisma";

import { prisma } from "@/lib/prisma";
import { ensureSettingsForUser } from "@/server/db/init";

export async function getSettings(userId: string) {
  return ensureSettingsForUser(userId);
}

export async function updateSettings(
  userId: string,
  data: Prisma.SettingsUpdateInput,
) {
  await ensureSettingsForUser(userId);

  return prisma.settings.update({
    where: { userId },
    data,
  });
}

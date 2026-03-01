import { prisma } from "@/lib/prisma";
import { buildDefaultSettingsCreateInput } from "@/server/db/settings-defaults";

export async function ensureSettingsForUser(userId: string) {
  return prisma.settings.upsert({
    where: { userId },
    update: {},
    create: buildDefaultSettingsCreateInput(userId),
  });
}

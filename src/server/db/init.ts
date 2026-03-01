import { prisma } from "@/lib/prisma";
import { buildDefaultSettingsCreateInput } from "@/server/db/settings-defaults";

export async function ensureSettingsForUser(userId: string) {
  try {
    return await prisma.settings.upsert({
      where: { userId },
      update: {},
      create: buildDefaultSettingsCreateInput(userId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const sequenceOutOfSync =
      message.includes("settings_pkey") ||
      message.includes("duplicate key value violates unique constraint");

    if (!sequenceOutOfSync) {
      throw error;
    }

    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('settings', 'id'),
        COALESCE((SELECT MAX(id) FROM settings), 0),
        true
      );
    `);

    return prisma.settings.upsert({
      where: { userId },
      update: {},
      create: buildDefaultSettingsCreateInput(userId),
    });
  }
}

import { createEntityId, dbQuery, dbQueryOne } from "@/lib/db";
import { buildDefaultSettingsCreateInput } from "@/server/db/settings-defaults";

const LEGACY_USER_ID = "legacy-user";

const STARTER_SNIPPETS: Array<{
  type: "intro" | "terms";
  language: "sk" | "en";
  title: string;
  contentMarkdown: string;
}> = [
  {
    type: "intro",
    language: "sk",
    title: "Uvod - standard",
    contentMarkdown:
      "Dakujeme za zaujem o spolupracu. Pripravili sme pre vas prehlad navrhovanych aktivit, rozsahu a ceny.",
  },
  {
    type: "intro",
    language: "en",
    title: "Intro - standard",
    contentMarkdown:
      "Thank you for your interest in working with us. Below is a clear overview of the proposed scope, timeline, and pricing.",
  },
  {
    type: "terms",
    language: "sk",
    title: "Podmienky - standard",
    contentMarkdown:
      "Splatnost faktury je 14 dni. Prace mimo dohodnuteho rozsahu budu nacenene samostatne po odsuhlaseni.",
  },
  {
    type: "terms",
    language: "en",
    title: "Terms - standard",
    contentMarkdown:
      "Invoice due date is 14 days. Work outside the agreed scope is quoted separately after approval.",
  },
  {
    type: "intro",
    language: "sk",
    title: "Uvod - web projekt",
    contentMarkdown:
      "Tato ponuka pokryva analyzu, navrh rozhrania a implementaciu weboveho riesenia v dohodnutom rozsahu.",
  },
  {
    type: "terms",
    language: "sk",
    title: "Podmienky - projekt",
    contentMarkdown:
      "Cena obsahuje 2 kola revizii. Dodanie prebieha etapovo po odsuhlaseni medzivystupov.",
  },
];

const STARTER_CATALOG_ITEMS: Array<{
  category: string;
  tags: string[];
  name: string;
  description: string;
  defaultUnit: "h" | "day" | "pcs" | "pkg";
  defaultUnitPrice: number;
}> = [
  {
    category: "Strategy",
    tags: ["workshop", "analysis"],
    name: "Discovery workshop",
    description: "Kick-off workshop and requirements alignment.",
    defaultUnit: "h",
    defaultUnitPrice: 65,
  },
  {
    category: "Design",
    tags: ["ui", "ux"],
    name: "UI design",
    description: "Design of pages/components based on approved direction.",
    defaultUnit: "h",
    defaultUnitPrice: 58,
  },
  {
    category: "Development",
    tags: ["frontend", "implementation"],
    name: "Frontend implementation",
    description: "Implementation of approved designs into production code.",
    defaultUnit: "h",
    defaultUnitPrice: 72,
  },
];

async function countByUser(table: string, userId: string): Promise<number> {
  const row = await dbQueryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table} WHERE user_id = $1`, [
    userId,
  ]);
  return Number(row?.count ?? "0");
}

async function claimLegacyWorkspaceForUser(userId: string): Promise<boolean> {
  try {
    const userCounts = await Promise.all([
      countByUser("clients", userId),
      countByUser("quotes", userId),
      countByUser("catalog_items", userId),
      countByUser("snippets", userId),
      countByUser("invoices", userId),
    ]);

    const userHasCoreData = userCounts.some((value) => value > 0);
    if (userHasCoreData) {
      return false;
    }

    const legacyCounts = await Promise.all([
      countByUser("clients", LEGACY_USER_ID),
      countByUser("quotes", LEGACY_USER_ID),
      countByUser("catalog_items", LEGACY_USER_ID),
      countByUser("snippets", LEGACY_USER_ID),
      countByUser("invoices", LEGACY_USER_ID),
    ]);

    const legacyHasCoreData = legacyCounts.some((value) => value > 0);
    if (!legacyHasCoreData) {
      return false;
    }

    const legacySettings = await dbQueryOne<{ id: number }>(
      `SELECT id FROM settings WHERE user_id = $1 ORDER BY id ASC LIMIT 1`,
      [LEGACY_USER_ID],
    );

    await dbQuery(`DELETE FROM settings WHERE user_id = $1`, [userId]);

    if (legacySettings) {
      await dbQuery(`UPDATE settings SET user_id = $1 WHERE id = $2`, [userId, legacySettings.id]);
      await dbQuery(`DELETE FROM settings WHERE user_id = $1 AND id <> $2`, [LEGACY_USER_ID, legacySettings.id]);
    }

    const tables = [
      "clients",
      "catalog_items",
      "snippets",
      "quotes",
      "quote_items",
      "scope_items",
      "quote_versions",
      "invoices",
      "invoice_items",
      "payments",
    ];

    for (const table of tables) {
      await dbQuery(`UPDATE ${table} SET user_id = $1 WHERE user_id = $2`, [userId, LEGACY_USER_ID]);
    }

    return true;
  } catch (error) {
    console.error("Legacy workspace claim skipped:", error);
    return false;
  }
}

async function ensureSettings(userId: string): Promise<void> {
  const defaults = buildDefaultSettingsCreateInput(userId);

  await dbQuery(
    `INSERT INTO settings (
      user_id,
      company_name,
      company_address,
      company_email,
      company_phone,
      default_language,
      default_currency,
      vat_rate,
      numbering_year,
      numbering_counter
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (user_id) DO NOTHING`,
    [
      defaults.userId,
      defaults.companyName,
      defaults.companyAddress,
      defaults.companyEmail,
      defaults.companyPhone,
      defaults.defaultLanguage,
      defaults.defaultCurrency,
      defaults.vatRate,
      defaults.numberingYear,
      defaults.numberingCounter,
    ],
  );
}

export async function ensureUserBootstrapData(userId: string): Promise<void> {
  await claimLegacyWorkspaceForUser(userId);
  await ensureSettings(userId);

  const [snippetCount, catalogCount] = await Promise.all([
    countByUser("snippets", userId),
    countByUser("catalog_items", userId),
  ]);

  if (snippetCount === 0) {
    for (const snippet of STARTER_SNIPPETS) {
      await dbQuery(
        `INSERT INTO snippets (id, user_id, type, language, title, content_markdown)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          createEntityId("snip"),
          userId,
          snippet.type,
          snippet.language,
          snippet.title,
          snippet.contentMarkdown,
        ],
      );
    }
  }

  if (catalogCount === 0) {
    for (const item of STARTER_CATALOG_ITEMS) {
      await dbQuery(
        `INSERT INTO catalog_items (id, user_id, category, tags, name, description, default_unit, default_unit_price)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)`,
        [
          createEntityId("cat"),
          userId,
          item.category,
          JSON.stringify(item.tags),
          item.name,
          item.description,
          item.defaultUnit,
          item.defaultUnitPrice,
        ],
      );
    }
  }
}

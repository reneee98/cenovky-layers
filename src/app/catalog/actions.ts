"use server";

import type { Unit as CatalogUnit } from "@/types/domain";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth";
import {
  createCatalogItem,
  deleteCatalogItem,
  updateCatalogItem,
} from "@/server/repositories";
import { isPrismaKnownRequestError } from "@/lib/prisma-errors";

type Unit = CatalogUnit;

type CatalogFormFieldErrors = Partial<
  Record<
    "category" | "name" | "default_unit" | "default_unit_price",
    string
  >
>;

export type CatalogFormActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: CatalogFormFieldErrors;
};

const VALID_UNITS: Unit[] = ["h", "day", "pcs", "pkg"];

function readRequiredString(
  formData: FormData,
  field: keyof CatalogFormFieldErrors,
  errors: CatalogFormFieldErrors,
): string {
  const rawValue = formData.get(field);
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    errors[field] = "Toto pole je povinne.";
  }

  return value;
}

function readOptionalString(formData: FormData, field: string): string | null {
  const rawValue = formData.get(field);
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  return value.length > 0 ? value : null;
}

function parseTags(rawTags: string): string[] {
  const seen = new Set<string>();

  return rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .filter((tag) => {
      const key = tag.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function buildCatalogUrl(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `/catalog?${params.toString()}`;
}

export async function saveCatalogItemAction(
  _previousState: CatalogFormActionState,
  formData: FormData,
): Promise<CatalogFormActionState> {
  const userId = await requireUserId();
  const errors: CatalogFormFieldErrors = {};

  const itemIdEntry = formData.get("catalog_item_id");
  const catalogItemId =
    typeof itemIdEntry === "string" && itemIdEntry.trim().length > 0
      ? itemIdEntry.trim()
      : null;

  const category = readRequiredString(formData, "category", errors);
  const name = readRequiredString(formData, "name", errors);
  const description = readOptionalString(formData, "description");
  const tagsRaw = readOptionalString(formData, "tags") ?? "";
  const tags = parseTags(tagsRaw);

  const unitEntry = formData.get("default_unit");
  const defaultUnit =
    typeof unitEntry === "string" && VALID_UNITS.includes(unitEntry as Unit)
      ? (unitEntry as Unit)
      : null;

  if (!defaultUnit) {
    errors.default_unit = "Vyberte platnu jednotku.";
  }

  const defaultUnitPriceRaw = readRequiredString(formData, "default_unit_price", errors);
  const defaultUnitPrice = Number(defaultUnitPriceRaw.replace(",", "."));

  if (!Number.isFinite(defaultUnitPrice) || defaultUnitPrice < 0) {
    errors.default_unit_price = "Jednotkova cena musi byt nezaporne cislo.";
  }

  if (Object.keys(errors).length > 0 || !defaultUnit) {
    return {
      status: "error",
      message: "Opravte vyznacene polia.",
      fieldErrors: errors,
    };
  }

  try {
    if (catalogItemId) {
      await updateCatalogItem(userId, catalogItemId, {
        category,
        tags,
        name,
        description,
        defaultUnit,
        defaultUnitPrice,
      });
    } else {
      await createCatalogItem(userId, {
        category,
        tags,
        name,
        description,
        defaultUnit,
        defaultUnitPrice,
      });
    }
  } catch (error) {
    if (isPrismaKnownRequestError(error, "P2025")) {
      return {
        status: "error",
        message: "Katalogova polozka nebola najdena.",
      };
    }

    throw error;
  }

  revalidatePath("/catalog");

  redirect(
    buildCatalogUrl({
      notice: catalogItemId
        ? "Katalogova polozka bola upravena."
        : "Katalogova polozka bola vytvorena.",
    }),
  );
}

export async function deleteCatalogItemAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const itemIdEntry = formData.get("catalog_item_id");
  const itemId =
    typeof itemIdEntry === "string" && itemIdEntry.trim().length > 0
      ? itemIdEntry.trim()
      : null;

  if (!itemId) {
    redirect(buildCatalogUrl({ error: "Chyba ID katalogovej polozky." }));
  }

  try {
    await deleteCatalogItem(userId, itemId);
  } catch (error) {
    if (isPrismaKnownRequestError(error, "P2025")) {
      redirect(buildCatalogUrl({ error: "Katalogova polozka nebola najdena." }));
    }

    throw error;
  }

  revalidatePath("/catalog");
  redirect(buildCatalogUrl({ notice: "Katalogova polozka bola vymazana." }));
}

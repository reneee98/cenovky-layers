export const QUOTE_ITEM_SECTION_MARKER = "__section__";

export function isQuoteItemSectionDescription(value: string | null | undefined): boolean {
  if (typeof value !== "string") {
    return false;
  }

  return value.trim().toLowerCase() === QUOTE_ITEM_SECTION_MARKER;
}

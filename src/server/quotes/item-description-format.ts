const ITEM_DESCRIPTION_BULLET_PATTERN = /^(?:[-*•]\s+|\d+[.)]\s+)/;

export type ItemDescriptionSegment = {
  text: string;
  bold: boolean;
};

export type ItemDescriptionLine = {
  kind: "bullet" | "paragraph";
  segments: ItemDescriptionSegment[];
};

function splitBoldSegments(value: string): ItemDescriptionSegment[] {
  const segments: ItemDescriptionSegment[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      segments.push({
        text: value.slice(lastIndex, matchIndex),
        bold: false,
      });
    }

    const boldText = match[1] ?? "";
    if (boldText.length > 0) {
      segments.push({
        text: boldText,
        bold: true,
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < value.length) {
    segments.push({
      text: value.slice(lastIndex),
      bold: false,
    });
  }

  if (segments.length === 0) {
    return [{ text: value, bold: false }];
  }

  return segments.filter((segment) => segment.text.length > 0);
}

export function getItemDescriptionLines(description: string | null): string[] {
  if (!description) {
    return [];
  }

  return description
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function stripItemDescriptionBulletPrefix(line: string): string {
  return line.replace(ITEM_DESCRIPTION_BULLET_PATTERN, "").trim();
}

export function areAllItemDescriptionLinesBullets(lines: string[]): boolean {
  return lines.length > 0 && lines.every((line) => ITEM_DESCRIPTION_BULLET_PATTERN.test(line));
}

export function parseItemDescription(description: string | null): ItemDescriptionLine[] {
  const lines = getItemDescriptionLines(description);
  const allBullets = areAllItemDescriptionLinesBullets(lines);

  return lines.map((line) => ({
    kind: allBullets ? "bullet" : "paragraph",
    segments: splitBoldSegments(
      allBullets ? stripItemDescriptionBulletPrefix(line) : line,
    ),
  }));
}

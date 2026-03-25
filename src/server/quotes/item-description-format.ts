const ITEM_DESCRIPTION_BULLET_PATTERN = /^(?:[-*•]\s+|\d+[.)]\s+)/;

export type ItemDescriptionSegment = {
  text: string;
  bold: boolean;
};

export type ItemDescriptionLine = {
  kind: "bullet" | "paragraph" | "spacer";
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

function getItemDescriptionRawLines(description: string | null): string[] {
  if (!description) {
    return [];
  }

  return description.replace(/\r\n/g, "\n").split("\n");
}

export function stripItemDescriptionBulletPrefix(line: string): string {
  return line.replace(ITEM_DESCRIPTION_BULLET_PATTERN, "").trim();
}

export function areAllItemDescriptionLinesBullets(lines: string[]): boolean {
  return lines.length > 0 && lines.every((line) => ITEM_DESCRIPTION_BULLET_PATTERN.test(line));
}

export function parseItemDescription(description: string | null): ItemDescriptionLine[] {
  const rawLines = getItemDescriptionRawLines(description);
  const nonEmptyLines = rawLines.map((line) => line.trim()).filter((line) => line.length > 0);
  const allBullets = areAllItemDescriptionLinesBullets(nonEmptyLines);

  return rawLines
    .map((rawLine) => {
      const line = rawLine.trim();

      if (line.length === 0) {
        return {
          kind: "spacer" as const,
          segments: [],
        };
      }

      return {
        kind: allBullets ? ("bullet" as const) : ("paragraph" as const),
        segments: splitBoldSegments(
          allBullets ? stripItemDescriptionBulletPrefix(line) : line,
        ),
      };
    })
    .filter((line, index, collection) => {
      if (line.kind !== "spacer") {
        return true;
      }

      const previous = collection[index - 1];
      const next = collection[index + 1];
      return Boolean(previous && next);
    });
}

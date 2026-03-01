export type ScopePresetItem = {
  key: string;
  label: string;
  description?: string;
};

export type ScopePresetCategory = {
  key: string;
  label: string;
  items: ScopePresetItem[];
};

export const SCOPE_PRESET: ScopePresetCategory[] = [
  {
    key: "discovery",
    label: "Discovery",
    items: [
      {
        key: "workshop",
        label: "Kickoff workshop",
        description: "Ciele, rozsah, prioritizacia a stakeholder alignment.",
      },
      {
        key: "audit",
        label: "Audit existujuceho riesenia",
        description: "Analyza UX, obsahu a technickych limitov.",
      },
      {
        key: "ia",
        label: "Informacna architektura",
      },
    ],
  },
  {
    key: "design",
    label: "Design",
    items: [
      {
        key: "wireframes",
        label: "Wireframes",
      },
      {
        key: "ui-kit",
        label: "UI system / komponenty",
      },
      {
        key: "screens",
        label: "Final screen designs",
      },
    ],
  },
  {
    key: "delivery",
    label: "Delivery",
    items: [
      {
        key: "prototype",
        label: "Interactive prototype",
      },
      {
        key: "handoff",
        label: "Developer handoff",
      },
      {
        key: "qa",
        label: "Design QA support",
      },
    ],
  },
];

export type ScopeSelection = {
  category: string;
  itemKey: string;
  label: string;
  description: string | null;
  sortOrder: number;
};

export function scopeSelectionId(category: string, itemKey: string): string {
  return `${category}:${itemKey}`;
}

export function buildScopeSelectionFromIds(ids: string[]): ScopeSelection[] {
  const set = new Set(ids);
  const selections: ScopeSelection[] = [];
  let sortOrder = 0;

  for (const category of SCOPE_PRESET) {
    for (const item of category.items) {
      const id = scopeSelectionId(category.key, item.key);
      if (!set.has(id)) {
        continue;
      }

      selections.push({
        category: category.label,
        itemKey: item.key,
        label: item.label,
        description: item.description ?? null,
        sortOrder,
      });

      sortOrder += 1;
    }
  }

  return selections;
}

export function buildScopeIdsFromSelections(selections: ScopeSelection[]): string[] {
  const labelToCategoryKey = new Map(SCOPE_PRESET.map((category) => [category.label, category.key]));
  const ids: string[] = [];

  for (const selection of selections) {
    const categoryKey = labelToCategoryKey.get(selection.category);
    if (!categoryKey) {
      continue;
    }

    ids.push(scopeSelectionId(categoryKey, selection.itemKey));
  }

  return ids;
}

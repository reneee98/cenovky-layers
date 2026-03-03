import assert from "node:assert/strict";
import test from "node:test";

import {
  buildScopeIdsFromSelections,
  buildScopeSelectionFromIds,
  scopeSelectionId,
} from "../lib/quotes/scope-preset";

test("scope preset: builds deterministic selections in preset order", () => {
  const ids = [
    scopeSelectionId("delivery", "qa"),
    scopeSelectionId("discovery", "workshop"),
    scopeSelectionId("delivery", "qa"),
  ];

  const selections = buildScopeSelectionFromIds(ids);

  assert.equal(selections.length, 2);
  assert.deepEqual(
    selections.map((row) => ({ category: row.category, itemKey: row.itemKey, sortOrder: row.sortOrder })),
    [
      { category: "Discovery", itemKey: "workshop", sortOrder: 0 },
      { category: "Delivery", itemKey: "qa", sortOrder: 1 },
    ],
  );
});

test("scope preset: converts selections back to ids and skips unknown categories", () => {
  const ids = buildScopeIdsFromSelections([
    {
      category: "Discovery",
      itemKey: "audit",
      label: "Audit existujuceho riesenia",
      description: null,
      sortOrder: 0,
    },
    {
      category: "Unknown",
      itemKey: "x",
      label: "X",
      description: null,
      sortOrder: 1,
    },
  ]);

  assert.deepEqual(ids, [scopeSelectionId("discovery", "audit")]);
});

# Invoices Module — UI/UX Design

Design for the Invoices module aligned with Quote Builder: premium, elegant, clean, fast. Uses shadcn/ui, Tailwind, and the app design system (globals.css tokens, primitives, Badge, Button, etc.).

---

## Design principles

- **Same visual language as Quotes**: cards with `rounded-2xl`, soft borders (`border-slate-200/80`), subtle shadows; sticky table headers; Badge tones; toolbar with search + filters.
- **Premium cards**: shadcn `Card` (or equivalent) for sections; clear hierarchy with CardTitle + CardDescription.
- **Strong table readability**: existing `ui-table`, `ui-table-wrap`; numeric columns right-aligned, tabular-nums; row hover.
- **Sticky summary/totals** where appropriate (e.g. detail page totals summary).
- **Responsive**: mobile card stack for list; filters wrap; no horizontal scroll on small screens where avoidable.
- **No clutter**: only essential actions and data above the fold; secondary actions in dropdown or secondary buttons.

---

## Screen layouts

### 1. Invoices Dashboard + List (single page: `/invoices`)

- **Top**: Page title "Faktury", short description, primary CTA "Nová faktura".
- **Stats row**: 5 cards in a responsive grid (1 col mobile → 2 → 5):
  - Fakturované tento rok | Uhradené tento rok | Neuhradené tento rok | Po splatnosti | Zostáva fakturovať z ponúk
- **Toolbar**: Search (placeholder: "Hľadať číslo faktúry / klienta") + filters: Rok, Stav, Klient, Mena, Prepojenie (s ponukou / bez). Button "Filtrovať".
- **Content**: Either empty state ("Pre zvolené filtre sa nenašli žiadne faktúry." / "Zatiaľ nemáte žiadne faktúry.") or:
  - **Desktop**: Table (Číslo, Klient, Ponuka, Vystavená, Splatnosť, Spolu, Uhradené, Na úhradu, Stav, Akcie). Sticky header. Row actions: Otvoriť, Zmena stavu (select + Uložiť), Odstrániť.
  - **Mobile**: Stack of cards per invoice (number, client, dates, amounts, status, actions).
- **Feedback**: `notice` / `error` query params shown above table.

### 2. Invoice Detail (`/invoices/[id]`)

- **Header**: Title "Faktúra {number}", description "Detail faktúry, platby a export PDF." Actions: Späť na zoznam | Upraviť faktúru | Export PDF (primary).
- **Alerts**: Notice / error from query params.
- **Layout**: Two main columns (2/3 + 1/3 on xl).
  - **Left column**:
    - **Meta card**: Číslo, Variabilný symbol, Dátum vystavenia, Dátum dodania, Splatnosť, Spôsob platby, Mená, Stav, Typ, Daňový režim, DPH, Prepojená ponuka. Optional: Právna poznámka, Poznámka.
    - **Parties**: Two cards side by side (xl: 2 cols): Dodávateľ (zo snapshotu), Odberateľ (zo snapshotu).
    - **Items card**: Table (Názov, Popis, Jednotka, Množstvo, Cena/j., Zľava %, DPH %, Spolu). Under table: **Sticky totals block** (right-aligned): Medzisúčet, Zľava, Základ dane, DPH, **Spolu**, Uhradené, **Na úhradu**.
    - **Payments**: Card "Platby" with "Na úhradu: {amount}", [Pridať platbu] button; second card "História platieb" (table or empty text).
  - **Right column (sidebar)**:
    - **Akcie card**: Zmena stavu (select + Uložiť stav), Odstrániť faktúru.
- **Footer note**: Vytvorené / Aktualizované (in payments section or meta).

### 3. Create Invoice (`/invoices/new`) & Edit Invoice (`/invoices/[id]/edit`)

- **Header**: Title "Nová faktúra" or "Nová faktúra z ponuky {number}" / "Upraviť faktúru {number}". Description one line. Action: Späť na faktury / Späť na detail.
- **Form**: Single column; use existing `InvoiceForm` layout. Sections: Client + Quote (if from quote, show preset), Numbers & dates, VAT, Items table, Legal note / Note. Primary submit: "Vytvoriť faktúru" / "Uložiť zmeny". Creating from quote should feel effortless (prefilled, one CTA).

### 4. Add Payment dialog (modal)

- **Title**: "Pridať platbu"
- **Description**: "Zaznamenajte úhradu. Suma nesmie presiahnúť zostávajúcu sumu na úhradu ({amount})."
- **Fields**: Dátum platby (date), Suma (text, max hint), Spôsob platby (text), Poznámka (optional).
- **Footer**: Zrušiť (secondary), Pridať platbu (primary, disabled if amount invalid or exceeds due).

---

## Component tree

```
AppShell
├── InvoicesPage (dashboard + list)
│   ├── PageHeader (title, description, "Nová faktura" link)
│   ├── InvoiceStatsCards (5 stat cards)
│   ├── InvoiceListToolbar (form: search, filters, submit)
│   ├── [notice/error]
│   └── InvoiceList (empty state | InvoiceTable | InvoiceMobileCards)
│
├── InvoiceDetailPage
│   ├── PageHeader (title, description, actions)
│   ├── [alerts]
│   ├── Grid (2/3 + 1/3)
│   │   ├── InvoiceDetailMetaCard
│   │   ├── InvoiceDetailParties (Dodávateľ + Odberateľ cards)
│   │   ├── InvoiceDetailItemsCard (table + sticky totals)
│   │   ├── InvoiceDetailPaymentsCard + InvoiceDetailPaymentsHistoryCard
│   │   └── InvoiceDetailActionsCard (status, delete)
│   └── (AddPaymentTrigger opens AddPaymentDialog)
│
├── NewInvoicePage / EditInvoicePage
│   ├── PageHeader
│   └── InvoiceForm (existing)
│
└── AddPaymentDialog (shadcn Dialog)
    ├── DialogHeader (title, description)
    ├── Form (date, amount, method, note)
    └── DialogFooter (cancel, submit)
```

**Shared / reusable components:**

- `InvoiceStatsCard`: single stat (label, value, note); used 5× on dashboard.
- `InvoiceListToolbar`: form with search input + filter selects + Filtrovať.
- `InvoiceListEmptyState`: uses `ListEmptyState`; message depends on hasActiveFilters.
- `InvoiceTable`: desktop table with columns and row actions.
- `InvoiceMobileCard`: single invoice card for mobile list.
- `InvoiceDetailMetaCard`, `InvoiceDetailPartiesCard`, `InvoiceDetailItemsCard`, `InvoiceDetailTotalsSummary`, `InvoiceDetailPaymentsCard`, `InvoiceDetailActionsCard`: section cards for detail page.
- `AddPaymentDialog` + `AddPaymentTrigger`: already exist; ensure shadcn Dialog styling matches design system.

---

## Microcopy

| Context | SK copy |
|--------|--------|
| Page title | Faktúry |
| Page description | Prehľad faktúrácie, platieb a zostatkov z ponúk. |
| Primary CTA | Nová faktúra |
| Stat: invoiced this year | Fakturované tento rok |
| Stat: paid this year | Uhradené tento rok |
| Stat: unpaid this year | Neuhradené tento rok |
| Stat: overdue | Po splatnosti |
| Stat: remaining from quotes | Zostáva fakturovať z ponúk |
| Stat note | Súčet naprieč menami / Počet faktúr / Podľa prepojených faktúr |
| Search placeholder | Hľadať číslo faktúry / klienta |
| Filter: year | Rok |
| Filter: status | Stav |
| Filter: client | Klient |
| Filter: currency | Mena |
| Filter: linked | Prepojenie s ponukou |
| Filter submit | Filtrovať |
| Empty (no filters) | Zatiaľ nemáte žiadne faktúry. |
| Empty (with filters) | Pre zvolené filtre sa nenašli žiadne faktúry. |
| Detail title | Faktúra {number} |
| Detail description | Detail faktúry, platby a export PDF. |
| Back to list | Späť na zoznam |
| Edit invoice | Upraviť faktúru |
| Export PDF | Export PDF |
| Meta section | Meta |
| Parties: supplier | Dodávateľ |
| Parties: client | Odberateľ |
| Items section | Položky |
| Totals: subtotal | Medzisúčet |
| Totals: discount | Zľava |
| Totals: tax base | Základ dane |
| Totals: VAT | DPH |
| Totals: total | Spolu |
| Totals: paid | Uhradené |
| Totals: due | Na úhradu |
| Payments section | Platby |
| Payments history | História platieb |
| Add payment | Pridať platbu |
| No payments yet | Zatiaľ nebola pridaná žiadna platba. |
| Actions section | Akcie |
| Change status | Zmena stavu |
| Save status | Uložiť stav |
| Delete invoice | Odstrániť faktúru |
| New invoice | Nová faktúra |
| New from quote | Nová faktúra z ponuky {number} |
| Edit invoice (title) | Upraviť faktúru {number} |
| Add payment dialog title | Pridať platbu |
| Add payment dialog description | Zaznamenajte úhradu. Suma nesmie presiahnúť zostávajúcu sumu na úhradu ({amount}). |
| Payment date label | Dátum platby |
| Amount label | Suma |
| Method label | Spôsob platby |
| Note label | Poznámka (voliteľné) |
| Cancel | Zrušiť |
| Created/Updated | Vytvorené / Aktualizované |

Status labels use existing `formatInvoiceStatus` (Koncept, Odoslaná, Čiastočne uhradená, Uhradená, Po splatnosti, Stornovaná).

---

## Implementation notes

- Use **shadcn** `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` for all section cards on dashboard and detail.
- Use existing **Button** (`ui-btn ui-btn--primary`, `ui-btn--secondary`), **Badge** (tone), **Input**, **Select**, **ListEmptyState**, **IconActionLink**, **IconActionButton** from `@/components/ui`.
- Use **SearchIcon** in toolbar like Quotes page.
- Tables: keep `ui-table-wrap`, `ui-table`, `ui-table-cell--text`, `ui-table-cell--number`, `ui-table-cell--strong`, `ui-table-actions`.
- Responsive grid: `grid gap-3 sm:grid-cols-2 xl:grid-cols-5` for stats; `xl:grid-cols-3` for detail (2+1); `xl:grid-cols-2` for parties.
- Totals summary: right-aligned, `sm:ml-auto`, optional `sticky top-4` if needed for long items list.

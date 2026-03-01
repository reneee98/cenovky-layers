import type { Language, QuoteStatus } from "@/types/domain";

type LocaleCopy = {
  actions: {
    save: string;
    exportPdf: string;
    duplicate: string;
    insertSnippet: string;
    addItem: string;
    addSection: string;
    addFromCatalog: string;
    addAndAnother: string;
  };
  autosave: {
    saving: string;
    savedNow: string;
    error: string;
  };
  empty: {
    noItemsTitle: string;
    noItemsDescription: string;
    noScopeTitle: string;
    noScopeDescription: string;
    noVersions: string;
  };
  labels: {
    vatOn: string;
    vatOff: string;
    vatRate: string;
    discount: string;
    totalDiscountPct: string;
    totalDiscountAmount: string;
    revisions: string;
    summary: string;
    versions: string;
    status: string;
    intro: string;
    scope: string;
    items: string;
    terms: string;
    search: string;
    category: string;
    title: string;
    client: string;
    language: string;
    currency: string;
    validUntil: string;
    showClientInPdf: string;
    showCompanyInPdf: string;
    name: string;
    unit: string;
    qty: string;
    unitPrice: string;
    lineTotal: string;
    section: string;
    item: string;
    sectionTitle: string;
    itemName: string;
    sectionHint: string;
    noTotalDiscount: string;
    subtotal: string;
    vat: string;
    grandTotal: string;
    searchCatalogPlaceholder: string;
    searchSnippetsPlaceholder: string;
    catalogDescription: string;
    allCategories: string;
    noCatalogItems: string;
    noSnippets: string;
    deleteRow: string;
    dragRow: string;
    editDescription: string;
    hideDescription: string;
    descriptionPlaceholder: string;
    descriptionHint: string;
  };
  statuses: Record<QuoteStatus, string>;
  confirmations: {
    duplicate: string;
  };
};

export const MICROCOPY: Record<Language, LocaleCopy> = {
  sk: {
    actions: {
      save: "Ulozit",
      exportPdf: "Export PDF",
      duplicate: "Duplikovat",
      insertSnippet: "Vlozit sablonu",
      addItem: "Pridat polozku",
      addSection: "Pridat sekciu",
      addFromCatalog: "Pridat z katalogu",
      addAndAnother: "Pridat a pokracovat",
    },
    autosave: {
      saving: "Uklada sa...",
      savedNow: "Ulozene • prave teraz",
      error: "Automaticke ulozenie zlyhalo",
    },
    empty: {
      noItemsTitle: "Zatial nemas ziadne polozky",
      noItemsDescription: "Pridaj polozku z katalogu alebo vytvor vlastny riadok.",
      noScopeTitle: "Rozsah este nie je vybraty",
      noScopeDescription: "Vyber body rozsahu, ktore sa maju zobrazit v ponuke.",
      noVersions: "Zatial bez exportov",
    },
    labels: {
      vatOn: "DPH zapnuta",
      vatOff: "DPH vypnuta",
      vatRate: "Sadzba DPH",
      discount: "Zlava",
      totalDiscountPct: "Celkova zlava (%)",
      totalDiscountAmount: "Celkova zlava (suma)",
      revisions: "Kola revizii",
      summary: "Suhrn a export",
      versions: "Verzie PDF",
      status: "Stav",
      intro: "Uvod",
      scope: "Rozsah prace",
      items: "Polozky",
      terms: "Podmienky",
      search: "Hladat",
      category: "Kategoria",
      title: "Nazov",
      client: "Klient",
      language: "Jazyk",
      currency: "Mena",
      validUntil: "Platnost do",
      showClientInPdf: "Zobrazit udaje klienta v PDF",
      showCompanyInPdf: "Zobrazit moje udaje v PDF",
      name: "Nazov",
      unit: "Jednotka",
      qty: "Mnozstvo",
      unitPrice: "Cena/j.",
      lineTotal: "Suma",
      section: "Sekcia",
      item: "Polozka",
      sectionTitle: "Nazov sekcie",
      itemName: "Nazov polozky",
      sectionHint: "Sekcia sluzi na zoskupenie nasledujucich poloziek v ponuke.",
      noTotalDiscount: "Bez celkovej zlavy",
      subtotal: "Medzisucet",
      vat: "DPH",
      grandTotal: "Spolu",
      searchCatalogPlaceholder: "Hladat katalogove polozky...",
      searchSnippetsPlaceholder: "Hladat sablony...",
      catalogDescription: "Hladaj podla nazvu alebo kategorie a polozky pridaj priamo do tabulky.",
      allCategories: "Vsetky kategorie",
      noCatalogItems: "Nenasli sa ziadne katalogove polozky.",
      noSnippets: "Nenasli sa ziadne sablony.",
      deleteRow: "Odstranit riadok",
      dragRow: "Presunut riadok",
      editDescription: "Upravit popis",
      hideDescription: "Skryt popis",
      descriptionPlaceholder: "Popis polozky (podporuje aj bullet body)...",
      descriptionHint: "Tip: pouzi '-' alebo '*' na odrazky.",
    },
    statuses: {
      draft: "Koncept",
      sent: "Odoslana",
      accepted: "Akceptovana",
      rejected: "Zamietnuta",
      invoiced: "Fakturovana",
    },
    confirmations: {
      duplicate: "Naozaj chces vytvorit kopiu tejto ponuky?",
    },
  },
  en: {
    actions: {
      save: "Save",
      exportPdf: "Export PDF",
      duplicate: "Duplicate",
      insertSnippet: "Insert snippet",
      addItem: "Add item",
      addSection: "Add section",
      addFromCatalog: "Add from catalog",
      addAndAnother: "Add and keep adding",
    },
    autosave: {
      saving: "Saving...",
      savedNow: "Saved • just now",
      error: "Autosave failed",
    },
    empty: {
      noItemsTitle: "No line items yet",
      noItemsDescription: "Add an item from the catalog or create a custom row.",
      noScopeTitle: "No scope selected yet",
      noScopeDescription: "Pick scope items to include in this quote.",
      noVersions: "No exports yet",
    },
    labels: {
      vatOn: "VAT enabled",
      vatOff: "VAT disabled",
      vatRate: "VAT rate",
      discount: "Discount",
      totalDiscountPct: "Total discount (%)",
      totalDiscountAmount: "Total discount (amount)",
      revisions: "Revision rounds",
      summary: "Summary & Export",
      versions: "PDF versions",
      status: "Status",
      intro: "Intro",
      scope: "Scope of work",
      items: "Items",
      terms: "Terms",
      search: "Search",
      category: "Category",
      title: "Title",
      client: "Client",
      language: "Language",
      currency: "Currency",
      validUntil: "Valid until",
      showClientInPdf: "Show client details in PDF",
      showCompanyInPdf: "Show my details in PDF",
      name: "Name",
      unit: "Unit",
      qty: "Qty",
      unitPrice: "Unit price",
      lineTotal: "Line total",
      section: "Section",
      item: "Item",
      sectionTitle: "Section title",
      itemName: "Item name",
      sectionHint: "Section row groups the following line items in the quote.",
      noTotalDiscount: "No total discount",
      subtotal: "Subtotal",
      vat: "VAT",
      grandTotal: "Grand total",
      searchCatalogPlaceholder: "Search catalog items...",
      searchSnippetsPlaceholder: "Search snippets...",
      catalogDescription: "Search by name or category and add items directly to the table.",
      allCategories: "All categories",
      noCatalogItems: "No catalog items found.",
      noSnippets: "No matching snippets.",
      deleteRow: "Delete row",
      dragRow: "Move row",
      editDescription: "Edit description",
      hideDescription: "Hide description",
      descriptionPlaceholder: "Item description (supports bullet points)...",
      descriptionHint: "Tip: use '-' or '*' for bullet points.",
    },
    statuses: {
      draft: "Draft",
      sent: "Sent",
      accepted: "Accepted",
      rejected: "Rejected",
      invoiced: "Invoiced",
    },
    confirmations: {
      duplicate: "Do you want to create a copy of this quote?",
    },
  },
};

# Data Model (MVP)

## Settings
- id
- company_name
- company_address
- company_ico (optional)
- company_dic (optional)
- company_icdph (optional)
- company_email
- company_phone
- company_website (optional)
- logo_url (optional)
- default_language: "sk" | "en"
- default_currency: string (e.g. "EUR")
- vat_rate: number (e.g. 20)
- numbering_year: number (current year)
- numbering_counter: number (last used integer)

## Client
- id
- type: "company" | "person"
- name
- billing_address_line1
- billing_address_line2 (optional)
- city
- zip
- country
- ico (optional)
- dic (optional)
- icdph (optional)
- contact_name
- contact_email
- contact_phone (optional)
- created_at
- updated_at

## CatalogItem
- id
- category: string
- tags: string[]
- name
- description (optional)
- default_unit: "h" | "day" | "pcs" | "pkg"
- default_unit_price: number
- created_at
- updated_at

## Template
- id
- name
- language: "sk" | "en"
- default_currency: string
- default_vat_enabled: boolean
- intro_snippet_id (optional)
- terms_snippet_id (optional)
- scope_preset: { category: string, item_key: string }[]
- items_preset: { catalog_item_id?: string, name: string, description?: string, unit: ..., qty: number, unit_price: number, discount_pct: number }[]
- created_at
- updated_at

## Snippet
- id
- type: "intro" | "terms"
- language: "sk" | "en"
- title
- content_markdown
- created_at
- updated_at

## Quote
- id
- number: string (YYYY-###)
- title
- status: "draft" | "sent" | "accepted" | "rejected" | "invoiced"
- client_id
- language: "sk" | "en"
- currency: string
- valid_until: date
- vat_enabled: boolean
- vat_rate: number (copied from Settings at creation; editable)
- intro_content_markdown
- terms_content_markdown
- revisions_included: number (1-3)
- total_discount_type: "none" | "pct" | "amount"
- total_discount_value: number
- created_at
- updated_at

## QuoteItem
- id
- quote_id
- name
- description (optional)
- unit: "h" | "day" | "pcs" | "pkg"
- qty: number
- unit_price: number
- discount_pct: number
- sort_order: number

## ScopeItem (selection per quote)
- id
- quote_id
- category: string
- item_key: string
- label: string
- description (optional)
- sort_order: number

## QuoteVersion (immutable snapshot)
- id
- quote_id
- version_number: integer
- exported_at: datetime
- snapshot_json: JSON (full quote + items + scope + totals)
- pdf_file_url (or stored blob reference)
# Client billing redesign – report

## Summary

Client model and create/edit flow were redesigned so that all billing data needed for future invoice creation can be stored in advance and automatically transferred into invoices via snapshot at creation time.

## 1. Database schema

**No migration added.** Existing schema (from `supabase_invoices_module_migration.sql` and `supabase_auth_owner_migration.sql`) already contains all required columns on `clients`:

- Basic: `type`, `name`, `company_name`, `first_name`, `last_name`, `contact_name`, `contact_email`, `contact_phone`
- Billing address: `billing_address_line1`, `billing_address_line2`, `city`, `zip`, `country`, `billing_street`, `billing_city`, `billing_zip`, `billing_country`
- Company/tax: `ico`, `dic`, `icdph`, `ic_dph`, `vat_payer`, `tax_regime_default`
- Billing defaults: `default_currency`, `default_due_days`, `default_payment_method`, `notes`

## 2. Client form UI (create / edit)

Form is split into **4 sections**:

1. **Základné údaje** – Typ klienta (firma / živnostník / fyzická osoba); pre firmu živnostníka: názov firmy; pre FO: krstné meno + priezvisko; kontaktná osoba, email, telefon.
2. **Fakturačná adresa** – Ulica a číslo, mesto, PSČ, krajina (bez povinného riadka 2).
3. **Firma a dane** – IČO, DIČ, IČ DPH, platca DPH, predvolený daňový režim.
4. **Predvolenky pre faktury** – Predvolená mena, splatnosť (dni), spôsob platby, poznámky.

- **Odvodenie `name`:** Pri ukladaní sa `name` nastaví podľa typu: pre firmu živnostníka z poľa názov firmy, pre FO z „krstné meno + priezvisko“. Tieto polia sú pre príslušný typ povinné.
- **Adresa:** Fakturačná adresa sa ukladá do `billing_street`, `billing_city`, `billing_zip`, `billing_country`; ak sú prázdne, do povinných stĺpcov sa zapíše „—“ (záznam je uložiteľný aj bez adresy).

## 3. Client detail UI

- **`/clients/[id]`** – Detail klienta (read-only) v rovnakých 4 sekciách ako formulár, s tlačidlami „Upraviť“ a „Nová faktura“.
- **`/clients/[id]/edit`** – Úprava klienta (presunutá z pôvodného `/clients/[id]`).

Na detaile sa zobrazí upozornenie, ak klient nemá dostatočné údaje na vytvorenie faktúry, a odkaz na doplnenie v úprave klienta.

## 4. Invoice prefill and snapshot

- **`buildClientSnapshot(client)`** v `src/server/invoices/snapshots.ts` – zostaví snapshot klienta (názov, adresa, IČO/DIČ/IC DPH, DPH, predvolenky) pre faktúru. Používa sa pri vytváraní aj úprave faktúry; faktúry ukladajú `client_snapshot_json`, takže **existujúce faktúry sa pri zmene klienta nemenia**.
- **`canCreateInvoiceForClient(client)`** – nová funkcia v `snapshots.ts`. Vráti `true`, ak má klient aspoň jednu z: `companyName` alebo (`firstName` a `lastName`). Používa sa na detaile klienta a vo formulári novej faktúry na blokovanie vytvorenia faktúry a zobrazenie validácie.

## 5. Validation and blocking

- **Uloženie klienta:** Povinné sú typ, pre firmu živnostníka názov firmy, pre FO krstné meno a priezvisko, kontaktná osoba a email. Ostatné polia (vrátane adresy) môžu byť prázdne.
- **Vytvorenie faktúry:** Ak vybraný klient nemá „billing identity“ (názov firmy alebo meno a priezvisko), vo formulári **Nová faktura** sa zobrazí blokujúca hláška a tlačidlo „Vytvoriť faktúru“ je disabled. V zozname klientov sa pri nekompletnom klientovi zobrazí „(nekompletne udaje)“.
- **Server-side:** Pri vytváraní faktúry sa volá `hasClientBillingIdentity(clientSnapshot)`; pri neplatnom klientovi sa vyhodí `CLIENT_BILLING_IDENTITY_REQUIRED` (správanie ostáva ako predtým).

## 6. Files touched

| Area | File |
|------|------|
| Snapshot / validation | `src/server/invoices/snapshots.ts` – `canCreateInvoiceForClient()` |
| Client form | `src/app/clients/client-form.tsx` – 4 sekcie, podmienené polia podľa typu |
| Client actions | `src/app/clients/actions.ts` – validácia podľa typu, odvodenie `name`, mapovanie adresy |
| Client detail | `src/app/clients/[id]/page.tsx` – read-only detail v 4 sekciách, tlačidlá Upraviť / Nová faktura |
| Client edit | `src/app/clients/[id]/edit/page.tsx` – nová stránka s formulárom úpravy |
| Invoice form | `src/app/invoices/invoice-form.tsx` – `invoiceReady`, blokovacia hláška, disabled submit |
| New invoice page | `src/app/invoices/new/page.tsx` – `canCreateInvoiceForClient` pre každého klienta, podpora `?client_id=` |
| Report | `codex/CLIENT_BILLING_REDESIGN_REPORT.md` (tento súbor) |

## 7. Behaviour summary

- Všetky fakturačné údaje sa zadávajú raz v karte klienta a pri vytvorení faktúry sa **automaticky prevezmú** do snapshotu (prefill).
- **Existujúce faktúry** sa pri zmene klienta **nemenia** – používajú snapshot uložený v čase vytvorenia.
- Klient môže byť uložený aj s neúplnými údajmi; pri vytvorení faktúry pre takého klienta sa zobrazí **blokovacia validácia** a odkaz na doplnenie údajov v karte klienta.

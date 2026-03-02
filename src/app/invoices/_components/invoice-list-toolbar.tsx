import { Input, Select } from "@/components/ui/fields";
import { SearchIcon } from "@/components/ui/icons";

type ClientOption = { id: string; name: string; companyName?: string | null };
type InvoiceListToolbarProps = {
  searchDefaultValue: string;
  yearDefaultValue: string;
  years: number[];
  statusDefaultValue: string;
  statusOptions: Array<{ value: string; label: string }>;
  clientIdDefaultValue: string;
  clients: ClientOption[];
  currencyDefaultValue: string;
  currencies: string[];
  linkedDefaultValue: string;
};

function clientDisplayName(client: ClientOption): string {
  return client.companyName?.trim() || client.name;
}

export function InvoiceListToolbar({
  searchDefaultValue,
  yearDefaultValue,
  years,
  statusDefaultValue,
  statusOptions,
  clientIdDefaultValue,
  clients,
  currencyDefaultValue,
  currencies,
  linkedDefaultValue,
}: InvoiceListToolbarProps) {
  return (
    <form method="get" className="ui-table-toolbar" role="search" aria-label="Filtre faktúr">
      <label className="ui-table-toolbar__search">
        <SearchIcon className="ui-table-toolbar__search-icon" aria-hidden />
        <Input
          name="search"
          type="search"
          defaultValue={searchDefaultValue}
          placeholder="Hľadať číslo faktúry / klienta"
          aria-label="Hľadať faktúry"
        />
      </label>

      <div className="ui-table-toolbar__filters">
        <Select name="year" defaultValue={yearDefaultValue} aria-label="Rok">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>

        <Select name="status" defaultValue={statusDefaultValue} aria-label="Stav">
          <option value="">Všetky stavy</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select name="client_id" defaultValue={clientIdDefaultValue} aria-label="Klient">
          <option value="">Všetci klienti</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {clientDisplayName(client)}
            </option>
          ))}
        </Select>

        <Select name="currency" defaultValue={currencyDefaultValue} aria-label="Mena">
          <option value="">Všetky meny</option>
          {currencies.map((curr) => (
            <option key={curr} value={curr}>
              {curr}
            </option>
          ))}
        </Select>

        <Select name="linked" defaultValue={linkedDefaultValue} aria-label="Prepojenie s ponukou">
          <option value="">Všetky</option>
          <option value="yes">S ponukou</option>
          <option value="no">Bez ponuky</option>
        </Select>

        <button type="submit" className="ui-btn ui-btn--secondary ui-btn--sm">
          Filtrovať
        </button>
      </div>
    </form>
  );
}

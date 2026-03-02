type ClientLike = {
  name: string;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function clean(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function getClientDisplayName(client: {
  name: string;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  return (
    clean(client.companyName) ??
    ([clean(client.firstName), clean(client.lastName)].filter(Boolean).join(" ") ||
      clean(client.name) ||
      "-")
  );
}

export function getClientBillingIdentity(client: ClientLike): string | null {
  const displayName = getClientDisplayName(client);
  return displayName !== "-" ? displayName : null;
}

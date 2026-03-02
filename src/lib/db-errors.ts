export type DbKnownErrorCode =
  | "P2002"
  | "P2003"
  | "P2025";

type DbKnownRequestLike = {
  code?: unknown;
};

export function isDbKnownRequestError(
  error: unknown,
  ...codes: DbKnownErrorCode[]
): error is DbKnownRequestLike {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as DbKnownRequestLike).code;
  return typeof code === "string" && (codes.length === 0 || codes.includes(code as DbKnownErrorCode));
}

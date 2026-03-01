export type PrismaKnownErrorCode =
  | "P2002"
  | "P2003"
  | "P2025";

type PrismaKnownRequestLike = {
  code?: unknown;
};

export function isPrismaKnownRequestError(
  error: unknown,
  ...codes: PrismaKnownErrorCode[]
): error is PrismaKnownRequestLike {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as PrismaKnownRequestLike).code;
  return typeof code === "string" && (codes.length === 0 || codes.includes(code as PrismaKnownErrorCode));
}

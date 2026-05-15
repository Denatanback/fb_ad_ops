import { db } from "@/server/db/client";

// ---------------------------------------------------------------------------
// Normalization & validation
// ---------------------------------------------------------------------------

/**
 * Normalises a raw account ID string:
 *   1. Trim surrounding whitespace
 *   2. Lowercase
 *   3. Collapse all whitespace runs into a single underscore
 *   4. Strip any character that is not a letter, digit, underscore, or hyphen
 */
export function normalizeAccountId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

/** Returns a human-readable validation error, or null if the value is valid. */
export function validateAccountId(normalized: string): string | null {
  if (!normalized) return "Account ID не может быть пустым.";
  if (normalized.length < 2) return "Account ID должен быть не менее 2 символов.";
  if (normalized.length > 80) return "Account ID не должен превышать 80 символов.";
  return null;
}

export function validateTag(tag: string): string | null {
  if (!tag.trim()) return "Тег не может быть пустым.";
  if (tag.trim().length > 80) return "Тег не должен превышать 80 символов.";
  return null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listAdAccounts() {
  return db.adAccount.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      accountId: true,
      tag: true,
      ownerId: true,
      createdById: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function findAdAccountById(id: string) {
  return db.adAccount.findUnique({
    where: { id },
    select: {
      id: true,
      accountId: true,
      tag: true,
      ownerId: true,
      createdById: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type CreateAdAccountInput = {
  accountId: string;
  tag: string;
  ownerId?: string | null;
  createdById?: string | null;
};

export async function createAdAccount(input: CreateAdAccountInput) {
  const normalized = normalizeAccountId(input.accountId);
  return db.adAccount.create({
    data: {
      accountId: normalized,
      tag: input.tag.trim(),
      ownerId: input.ownerId?.trim() || null,
      createdById: input.createdById ?? null,
      isActive: true,
    },
  });
}

export type UpdateAdAccountInput = {
  tag?: string;
  ownerId?: string | null;
};

export async function updateAdAccount(id: string, input: UpdateAdAccountInput) {
  return db.adAccount.update({
    where: { id },
    data: {
      ...(input.tag !== undefined ? { tag: input.tag.trim() } : {}),
      ...(input.ownerId !== undefined ? { ownerId: input.ownerId?.trim() || null } : {}),
    },
  });
}

export async function setAdAccountActive(id: string, isActive: boolean) {
  return db.adAccount.update({
    where: { id },
    data: { isActive },
  });
}

export type AdAccountAccessContext = {
  userId: string;
  role: "admin" | "member";
};

export function canManageAdAccount(
  account: { ownerId: string | null; createdById?: string | null } | null,
  context: AdAccountAccessContext
) {
  if (!account) return false;
  if (context.role === "admin") return true;
  return account.createdById === context.userId || account.ownerId === context.userId;
}

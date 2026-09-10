/**
 * Central permissions layer (Stage 3 §4). ALL access decisions flow through this
 * one module — permission logic is never scattered through UI components, and it
 * is enforced SERVER-SIDE (hiding a button in the browser is not security).
 *
 * Roles and their allowed actions match the agreed model:
 *   OWNER    — full control, including members and deletion
 *   EDITOR   — edit, comment, suggest, run AI, accept changes, export
 *   REVIEWER — read, comment, suggest (suggestions are proposals the owner acts on)
 *   VIEWER   — read only
 */

export type DocumentRole = "OWNER" | "EDITOR" | "REVIEWER" | "VIEWER";

export type DocumentAction =
  | "READ"
  | "EDIT"
  | "COMMENT"
  | "SUGGEST"
  | "RUN_AI"
  | "RUN_DIAGNOSTICS"
  | "ACCEPT_CHANGES"
  | "MANAGE_SPEC"
  | "MANAGE_MEMBERS"
  | "EXPORT"
  | "DELETE";

const PERMISSIONS: Record<DocumentRole, DocumentAction[]> = {
  OWNER: ["READ", "EDIT", "COMMENT", "SUGGEST", "RUN_AI", "RUN_DIAGNOSTICS", "ACCEPT_CHANGES", "MANAGE_SPEC", "MANAGE_MEMBERS", "EXPORT", "DELETE"],
  EDITOR: ["READ", "EDIT", "COMMENT", "SUGGEST", "RUN_AI", "RUN_DIAGNOSTICS", "ACCEPT_CHANGES", "EXPORT"],
  REVIEWER: ["READ", "COMMENT", "SUGGEST", "RUN_DIAGNOSTICS"],
  VIEWER: ["READ"],
};

export function can(role: DocumentRole, action: DocumentAction): boolean {
  return PERMISSIONS[role]?.includes(action) ?? false;
}

/**
 * Resolve a user's role on a document. The document owner is always OWNER; other
 * users get their DocumentMember role, or null if they have no access.
 * (This function is defined here as the single source of truth; the server
 * passes in the loaded document + membership so this stays pure and testable.)
 */
export function resolveRole(params: {
  userId: string | null;
  ownerId: string;
  memberRole?: DocumentRole | null;
}): DocumentRole | null {
  if (!params.userId) return null;
  if (params.userId === params.ownerId) return "OWNER";
  return params.memberRole ?? null;
}

/** Convenience: does this user's resolved role permit the action? */
export function authorize(
  params: { userId: string | null; ownerId: string; memberRole?: DocumentRole | null },
  action: DocumentAction
): boolean {
  const role = resolveRole(params);
  if (!role) return false;
  return can(role, action);
}

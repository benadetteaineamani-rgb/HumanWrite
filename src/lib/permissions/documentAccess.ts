import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { resolveRole, can, DocumentRole, DocumentAction } from "@/lib/permissions";

/**
 * Server-side authorization for documents (Stage 3). Loads the document's owner
 * and the current user's membership, resolves the role via the permissions
 * layer, and answers whether an action is allowed. This is the enforcement point
 * every collaboration route calls — the browser UI merely mirrors it.
 */
export async function getDocumentAccess(documentId: string): Promise<{
  userId: string | null;
  role: DocumentRole | null;
  can: (action: DocumentAction) => boolean;
}> {
  const user = await getUser();
  const userId = user?.id ?? null;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true },
  });
  if (!doc) return { userId, role: null, can: () => false };

  let memberRole: DocumentRole | null = null;
  if (userId && userId !== doc.userId) {
    const member = await prisma.documentMember.findUnique({
      where: { documentId_userId: { documentId, userId } },
      select: { role: true },
    });
    memberRole = (member?.role as DocumentRole) ?? null;
  }

  const role = resolveRole({ userId, ownerId: doc.userId, memberRole });
  return { userId, role, can: (action: DocumentAction) => (role ? can(role, action) : false) };
}

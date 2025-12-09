/**
 * Document Version Control
 * 
 * Track document versions, enable restore, diff view
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type DocumentVersion = {
  id: string;
  documentId: string;
  orgId: string;
  versionNumber: number;
  versionName: string | null;
  fileName: string;
  fileSize: number | null;
  storagePath: string;
  storageUrl: string | null;
  contentHash: string | null;
  createdBy: string;
  createdAt: Date;
  changeSummary: string | null;
  changedBy: string | null;
  parentVersionId: string | null;
};

/**
 * Create new document version
 */
export async function createDocumentVersion(
  documentId: string,
  orgId: string,
  userId: string,
  input: {
    fileName: string;
    fileSize?: number;
    storagePath: string;
    storageUrl?: string;
    contentHash?: string;
    versionName?: string;
    changeSummary?: string;
  },
): Promise<DocumentVersion> {
  const supabase = getSupabaseAdminClient();

  // Get latest version to set as parent
  const { data: latestVersion } = await supabase
    .from("document_versions")
    .select("id, version_number")
    .eq("document_id", documentId)
    .eq("org_id", orgId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
      org_id: orgId,
      file_name: input.fileName,
      file_size: input.fileSize ?? null,
      storage_path: input.storagePath,
      storage_url: input.storageUrl ?? null,
      content_hash: input.contentHash ?? null,
      version_name: input.versionName ?? null,
      change_summary: input.changeSummary ?? null,
      changed_by: userId,
      parent_version_id: latestVersion?.id ?? null,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to create document version");
  }

  return mapDocumentVersion(data);
}

/**
 * Get document versions
 */
export async function getDocumentVersions(
  documentId: string,
  orgId: string,
): Promise<DocumentVersion[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .eq("org_id", orgId)
    .order("version_number", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch document versions");
  }

  return (data ?? []).map(mapDocumentVersion);
}

/**
 * Get document version
 */
export async function getDocumentVersion(
  versionId: string,
  orgId: string,
): Promise<DocumentVersion> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("id", versionId)
    .eq("org_id", orgId)
    .single();

  if (error || !data) {
    throw new Error("Document version not found");
  }

  return mapDocumentVersion(data);
}

/**
 * Restore document to version (creates new version from old one)
 */
export async function restoreDocumentVersion(
  versionId: string,
  orgId: string,
  userId: string,
): Promise<DocumentVersion> {
  const supabase = getSupabaseAdminClient();

  // Get version to restore
  const version = await getDocumentVersion(versionId, orgId);

  // Create new version from restored one
  const { data: document } = await supabase
    .from("documents")
    .select("id, name")
    .eq("id", version.documentId)
    .eq("org_id", orgId)
    .single();

  if (!document) {
    throw new Error("Document not found");
  }

  // Create new version
  return await createDocumentVersion(version.documentId, orgId, userId, {
    fileName: document.name,
    fileSize: version.fileSize,
    storagePath: version.storagePath,
    storageUrl: version.storageUrl,
    contentHash: version.contentHash,
    versionName: `Restored from v${version.versionNumber}`,
    changeSummary: `Restored from version ${version.versionNumber}`,
  });
}

/**
 * Lock document for editing
 */
export async function lockDocument(
  documentId: string,
  orgId: string,
  userId: string,
  lockType: "edit" | "review" | "approve" = "edit",
  expiresInMinutes?: number,
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  // Check if already locked
  const { data: existingLock } = await supabase
    .from("document_locks")
    .select("*")
    .eq("document_id", documentId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (existingLock && existingLock.locked_by !== userId) {
    throw new Error("Document is locked by another user");
  }

  // Remove existing lock if same user
  if (existingLock && existingLock.locked_by === userId) {
    await supabase
      .from("document_locks")
      .delete()
      .eq("id", existingLock.id);
  }

  // Create new lock
  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60 * 1000)
    : null;

  const { error } = await supabase.from("document_locks").insert({
    document_id: documentId,
    org_id: orgId,
    locked_by: userId,
    lock_type: lockType,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error("Failed to lock document");
  }
}

/**
 * Unlock document
 */
export async function unlockDocument(
  documentId: string,
  orgId: string,
  userId: string,
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("document_locks")
    .delete()
    .eq("document_id", documentId)
    .eq("org_id", orgId)
    .eq("locked_by", userId);

  if (error) {
    throw new Error("Failed to unlock document");
  }
}

/**
 * Map database row to DocumentVersion
 */
function mapDocumentVersion(row: any): DocumentVersion {
  return {
    id: row.id,
    documentId: row.document_id,
    orgId: row.org_id,
    versionNumber: row.version_number,
    versionName: row.version_name,
    fileName: row.file_name,
    fileSize: row.file_size,
    storagePath: row.storage_path,
    storageUrl: row.storage_url,
    contentHash: row.content_hash,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    changeSummary: row.change_summary,
    changedBy: row.changed_by,
    parentVersionId: row.parent_version_id,
  };
}


/**
 * Atomic document transaction writer (Amendment 7).
 *
 * Commits all deterministic migration documents (19 documents: 5 field notes,
 * 6 galleries, 8 photos) in a single atomic Sanity transaction using client.transaction().
 */

export interface CommitDocumentsOptions {
  dryRun?: boolean;
}

export interface CommitDocumentsResult {
  committedCount: number;
  documentIds: string[];
  dryRun: boolean;
  transactionId?: string;
}

export async function commitDocumentsAtomically(
  client: any,
  documents: Array<{ _id: string; _type: string; [key: string]: any }>,
  options: CommitDocumentsOptions = {}
): Promise<CommitDocumentsResult> {
  const { dryRun = false } = options;
  const documentIds = documents.map((d) => d._id);

  if (dryRun) {
    return {
      committedCount: documents.length,
      documentIds,
      dryRun: true,
    };
  }

  const tx = client.transaction();
  for (const doc of documents) {
    tx.createOrReplace(doc);
  }

  let result: any;
  try {
    // Request synchronous indexing visibility where supported by Sanity API
    result = await tx.commit({ visibility: 'sync' });
  } catch (err: any) {
    // Fallback if client or mock does not accept options object
    try {
      result = await tx.commit();
    } catch (innerErr: any) {
      throw new Error(`Atomic document transaction failed: ${innerErr.message || err.message}`);
    }
  }

  return {
    committedCount: documents.length,
    documentIds,
    dryRun: false,
    transactionId: result?.transactionId,
  };
}

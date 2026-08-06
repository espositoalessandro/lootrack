import {
  Category,
  OutgoingSyncMutation,
  RemoteSyncRecord,
  RemoteSyncSnapshot,
  SyncEntityType,
  SyncMutation,
  Transaction,
} from "../data/models";

import { LocalSyncSnapshot } from "../data/repositories/sync-local-repository";

export type SyncConflictReason =
  "diverged" | "remote-missing" | "invalid-local-chain";

export interface SyncConflictCandidate {
  readonly entityType: SyncEntityType;
  readonly entityId: string;
  readonly reason: SyncConflictReason;

  readonly basePayloadJson: string | null;
  readonly localPayloadJson: string;
  readonly remotePayloadJson: string | null;

  readonly pendingMutationIds: readonly string[];
}

export interface SyncReconciliationPlan {
  /**
   * Remote records that can safely replace local state because there are no
   * pending local changes for their entities.
   */
  readonly remoteRecordsToApply: readonly RemoteSyncRecord[];

  /**
   * Existing outbox mutations that are already based on the current remote
   * records and can therefore be submitted unchanged.
   */
  readonly mutationsToPush: readonly OutgoingSyncMutation[];

  /**
   * Mutations already represented by the remote final state, usually after
   * a previous push succeeded but its acknowledgement was lost.
   */
  readonly mutationIdsToAcknowledge: readonly string[];

  /**
   * Divergent entities requiring three-way conflict resolution.
   */
  readonly conflicts: readonly SyncConflictCandidate[];
}

type LocalEntity = Transaction | Category;

interface LocalEntityReference {
  readonly entityType: SyncEntityType;
  readonly entity: LocalEntity;
}

function entityKey(entityType: SyncEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function toOutgoingMutation(mutation: SyncMutation): OutgoingSyncMutation {
  const { localSequence: _localSequence, ...outgoing } = mutation;
  return outgoing;
}

function remoteMatchesExpectedBase(
  remote: RemoteSyncRecord | undefined,
  mutation: SyncMutation,
): boolean {
  if (!remote) {
    return (
      mutation.expectedRevision === null && mutation.expectedMutationId === null
    );
  }

  return (
    mutation.expectedRevision === remote.revision &&
    mutation.expectedMutationId === remote.mutationId
  );
}

function sameRemoteVersion(
  local: LocalEntity,
  remote: RemoteSyncRecord,
): boolean {
  return (
    local.revision === remote.revision &&
    local.lastMutationId === remote.mutationId
  );
}

export function reconcileSyncSnapshots(
  local: LocalSyncSnapshot,
  remote: RemoteSyncSnapshot,
): SyncReconciliationPlan {
  const localEntities = new Map<string, LocalEntityReference>();
  const remoteRecords = new Map<string, RemoteSyncRecord>();
  const pendingByEntity = new Map<string, SyncMutation[]>();

  for (const transaction of local.transactions) {
    localEntities.set(entityKey("transaction", transaction.id), {
      entityType: "transaction",
      entity: transaction,
    });
  }

  for (const category of local.categories) {
    localEntities.set(entityKey("category", category.id), {
      entityType: "category",
      entity: category,
    });
  }

  for (const record of remote.records) {
    remoteRecords.set(entityKey(record.entityType, record.entityId), record);
  }

  for (const mutation of local.mutations) {
    const key = entityKey(mutation.entityType, mutation.entityId);
    const pending = pendingByEntity.get(key) ?? [];

    pending.push(mutation);
    pendingByEntity.set(key, pending);
  }

  const keys = new Set([
    ...localEntities.keys(),
    ...remoteRecords.keys(),
    ...pendingByEntity.keys(),
  ]);

  const remoteRecordsToApply: RemoteSyncRecord[] = [];
  const mutationsToPush: OutgoingSyncMutation[] = [];
  const mutationIdsToAcknowledge: string[] = [];
  const conflicts: SyncConflictCandidate[] = [];

  for (const key of keys) {
    const localReference = localEntities.get(key);
    const remoteRecord = remoteRecords.get(key);
    const pending = pendingByEntity.get(key) ?? [];

    /*
     * No local pending changes: remote state is authoritative.
     */
    if (pending.length === 0) {
      if (!remoteRecord) {
        if (localReference) {
          conflicts.push({
            entityType: localReference.entityType,
            entityId: localReference.entity.id,
            reason: "remote-missing",
            basePayloadJson: JSON.stringify(localReference.entity),
            localPayloadJson: JSON.stringify(localReference.entity),
            remotePayloadJson: null,
            pendingMutationIds: [],
          });
        }

        continue;
      }

      if (
        !localReference ||
        !sameRemoteVersion(localReference.entity, remoteRecord)
      ) {
        remoteRecordsToApply.push(remoteRecord);
      }

      continue;
    }

    const firstPending = pending[0];
    const lastPending = pending[pending.length - 1];

    /*
     * Recovery from an uncertain previous push:
     *
     * If remote.lastMutationId matches one of our pending mutations, that
     * mutation and every earlier mutation in the same local chain have already
     * reached Google Sheets.
     */
    const remotelyAppliedIndex = remoteRecord
      ? pending.findIndex(
          (mutation) => mutation.mutationId === remoteRecord.mutationId,
        )
      : -1;

    if (remoteRecord && remotelyAppliedIndex >= 0) {
      const acknowledged = pending.slice(0, remotelyAppliedIndex + 1);
      const remaining = pending.slice(remotelyAppliedIndex + 1);

      mutationIdsToAcknowledge.push(
        ...acknowledged.map((mutation) => mutation.mutationId),
      );

      if (remaining.length === 0) {
        continue;
      }

      if (!remoteMatchesExpectedBase(remoteRecord, remaining[0])) {
        conflicts.push({
          entityType: firstPending.entityType,
          entityId: firstPending.entityId,
          reason: "invalid-local-chain",
          basePayloadJson: remaining[0].basePayloadJson,
          localPayloadJson: lastPending.payloadJson,
          remotePayloadJson: remoteRecord.payloadJson,
          pendingMutationIds: remaining.map((mutation) => mutation.mutationId),
        });

        continue;
      }

      mutationsToPush.push(...remaining.map(toOutgoingMutation));
      continue;
    }

    /*
     * Ordinary non-conflicting pending chain.
     */
    if (remoteMatchesExpectedBase(remoteRecord, firstPending)) {
      mutationsToPush.push(...pending.map(toOutgoingMutation));
      continue;
    }

    /*
     * The remote entity changed after the first local mutation was based on it.
     * This enters three-way conflict resolution.
     */
    conflicts.push({
      entityType: firstPending.entityType,
      entityId: firstPending.entityId,
      reason: remoteRecord ? "diverged" : "remote-missing",
      basePayloadJson: firstPending.basePayloadJson,
      localPayloadJson: lastPending.payloadJson,
      remotePayloadJson: remoteRecord?.payloadJson ?? null,
      pendingMutationIds: pending.map((mutation) => mutation.mutationId),
    });
  }

  return {
    remoteRecordsToApply,
    mutationsToPush,
    mutationIdsToAcknowledge,
    conflicts,
  };
}

import { Injectable } from "@angular/core";
import {
  Category,
  SyncEntityType,
  SyncMutation,
  Transaction,
} from "../data/models";
import { SyncConflictCandidate } from "./sync-reconciler";

type SyncEntity = Transaction | Category;

const TRANSACTION_FIELDS = [
  "type",
  "amountInCents",
  "description",
  "occurredOn",
  "categoryId",
] as const;

const CATEGORY_FIELDS = ["type", "name"] as const;

export interface ResolvedSyncConflict {
  readonly status: "resolved";
  readonly finalEntity: SyncEntity;

  /**
   * Replacements for the old pending chain.
   * localSequence is preserved.
   */
  readonly rewrittenMutations: readonly SyncMutation[];

  readonly replacedMutationIds: readonly string[];
}

export interface UnresolvedSyncConflict {
  readonly status: "unresolved";
  readonly conflict: SyncConflictCandidate;
  readonly conflictingFields: readonly string[];
}

export type SyncConflictResolution =
  ResolvedSyncConflict | UnresolvedSyncConflict;

interface EntityMergeResult {
  readonly entity: SyncEntity;
  readonly conflictingFields: readonly string[];
}

export function resolveSyncConflict(
  conflict: SyncConflictCandidate,
): SyncConflictResolution {
  if (
    conflict.reason !== "diverged" ||
    conflict.basePayloadJson === null ||
    conflict.remotePayloadJson === null ||
    conflict.pendingMutations.length === 0
  ) {
    return unresolved(conflict, ["$record"]);
  }

  let currentRemote = parseEntity(
    conflict.remotePayloadJson,
    conflict.entityType,
  );

  const rewrittenMutations: SyncMutation[] = [];

  for (const mutation of conflict.pendingMutations) {
    if (
      mutation.localSequence === undefined ||
      mutation.basePayloadJson === null
    ) {
      return unresolved(conflict, ["$chain"]);
    }

    const originalBase = parseEntity(
      mutation.basePayloadJson,
      conflict.entityType,
    );

    const originalLocal = parseEntity(
      mutation.payloadJson,
      conflict.entityType,
    );

    const merge = mergeEntityChange(
      conflict.entityType,
      originalBase,
      originalLocal,
      currentRemote,
    );

    if (merge.conflictingFields.length > 0) {
      return unresolved(conflict, merge.conflictingFields);
    }

    if (
      currentRemote.revision === null ||
      currentRemote.lastMutationId === null
    ) {
      return unresolved(conflict, ["$remoteMetadata"]);
    }

    const mutationId = crypto.randomUUID();

    const nextEntity: SyncEntity = {
      ...merge.entity,
      revision: currentRemote.revision + 1,
      lastMutationId: mutationId,

      /*
       * Preserve the timestamp of the original local edit.
       * It remains informational and does not decide conflicts.
       */
      updatedAt: originalLocal.updatedAt,
    };

    rewrittenMutations.push({
      ...mutation,
      mutationId,
      expectedRevision: currentRemote.revision,
      expectedMutationId: currentRemote.lastMutationId,
      basePayloadJson: JSON.stringify(currentRemote),
      payloadJson: JSON.stringify(nextEntity),
      operation: nextEntity.deletedAt === null ? "upsert" : "delete",
    });

    currentRemote = nextEntity;
  }

  return {
    status: "resolved",
    finalEntity: currentRemote,
    rewrittenMutations,
    replacedMutationIds: conflict.pendingMutations.map(
      ({ mutationId }) => mutationId,
    ),
  };
}

function mergeEntityChange(
  entityType: SyncEntityType,
  base: SyncEntity,
  local: SyncEntity,
  remote: SyncEntity,
): EntityMergeResult {
  if (
    base.id !== local.id ||
    base.id !== remote.id ||
    base.createdAt !== local.createdAt ||
    base.createdAt !== remote.createdAt
  ) {
    return {
      entity: remote,
      conflictingFields: ["$identity"],
    };
  }

  const fields =
    entityType === "transaction" ? TRANSACTION_FIELDS : CATEGORY_FIELDS;

  const merged = { ...remote } as SyncEntity;
  const conflictingFields: string[] = [];

  const baseValues = base as unknown as Record<string, unknown>;
  const localValues = local as unknown as Record<string, unknown>;
  const remoteValues = remote as unknown as Record<string, unknown>;
  const mergedValues = merged as unknown as Record<string, unknown>;

  const localBusinessChanged = fields.some(
    (field) => !Object.is(localValues[field], baseValues[field]),
  );

  const remoteBusinessChanged = fields.some(
    (field) => !Object.is(remoteValues[field], baseValues[field]),
  );

  const localDeleted = base.deletedAt === null && local.deletedAt !== null;

  const remoteDeleted = base.deletedAt === null && remote.deletedAt !== null;

  /*
   * A delete racing with an edit must not be silently merged.
   */
  if (
    (localDeleted && remoteBusinessChanged) ||
    (remoteDeleted && localBusinessChanged)
  ) {
    conflictingFields.push("deletedAt");
  }

  for (const field of fields) {
    const baseValue = baseValues[field];
    const localValue = localValues[field];
    const remoteValue = remoteValues[field];

    const localChanged = !Object.is(localValue, baseValue);
    const remoteChanged = !Object.is(remoteValue, baseValue);

    if (localChanged && remoteChanged && !Object.is(localValue, remoteValue)) {
      conflictingFields.push(field);
      continue;
    }

    if (localChanged) {
      mergedValues[field] = localValue;
    } else {
      mergedValues[field] = remoteValue;
    }
  }

  if (localDeleted && remoteDeleted) {
    // Both sides deleted the entity. Different timestamps are not a conflict.
    merged.deletedAt = local.deletedAt;
  } else if (localDeleted) {
    merged.deletedAt = local.deletedAt;
  } else if (remoteDeleted) {
    merged.deletedAt = remote.deletedAt;
  } else {
    merged.deletedAt = null;
  }

  return {
    entity: merged,
    conflictingFields: [...new Set(conflictingFields)],
  };
}

function parseEntity(
  payloadJson: string,
  expectedType: SyncEntityType,
): SyncEntity {
  const value: unknown = JSON.parse(payloadJson);

  if (!value || typeof value !== "object") {
    throw new Error("Invalid synchronization entity payload");
  }

  const entity = value as SyncEntity;

  if (typeof entity.id !== "string") {
    throw new Error("Synchronization entity has no valid ID");
  }

  if (expectedType === "transaction" && !("amountInCents" in entity)) {
    throw new Error("Expected a transaction payload");
  }

  if (expectedType === "category" && !("name" in entity)) {
    throw new Error("Expected a category payload");
  }

  return entity;
}

function unresolved(
  conflict: SyncConflictCandidate,
  conflictingFields: readonly string[],
): UnresolvedSyncConflict {
  return {
    status: "unresolved",
    conflict,
    conflictingFields,
  };
}

@Injectable({
  providedIn: "root",
})
export class SyncConflictResolver {
  resolve(conflict: SyncConflictCandidate): SyncConflictResolution {
    try {
      return resolveSyncConflict(conflict);
    } catch {
      return unresolved(conflict, ["$payload"]);
    }
  }
}

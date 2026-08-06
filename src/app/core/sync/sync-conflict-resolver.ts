import { Injectable } from "@angular/core";

import {
  JsonObject,
  JsonValue,
  SYNC_ENTITY_ENVELOPE_SCHEMA,
  SyncEntityPayload,
  SyncEntityType,
  SyncEnvelopeFieldDescriptor,
  SyncMutation,
} from "../data/models";
import { SyncConflictCandidate } from "./sync-reconciler";

export interface ResolvedSyncConflict {
  readonly status: "resolved";
  readonly entityType: SyncEntityType;
  readonly entityId: string;

  /**
   * The final entity after replaying and rebasing every pending local
   * mutation on top of the current remote entity.
   */
  readonly finalEntity: SyncEntityPayload;

  /**
   * Replacements for the original pending mutation chain.
   *
   * Each mutation keeps its original localSequence but receives a new
   * mutationId and new expected remote metadata.
   */
  readonly rewrittenMutations: readonly SyncMutation[];

  /**
   * IDs of the original pending mutations being replaced.
   */
  readonly replacedMutationIds: readonly string[];
}

export interface UnresolvedSyncConflict {
  readonly status: "unresolved";
  readonly conflict: SyncConflictCandidate;

  /**
   * Paths that both local and remote changed incompatibly.
   *
   * Examples:
   * - "amountInCents"
   * - "merchant.name"
   * - "deletedAt"
   * - "$payload"
   */
  readonly conflictingFields: readonly string[];
}

export type SyncConflictResolution =
  ResolvedSyncConflict | UnresolvedSyncConflict;

interface EntityMergeResult {
  readonly entity: SyncEntityPayload;
  readonly conflictingFields: readonly string[];
}

interface SplitSyncEntity {
  /**
   * Every property not declared in SYNC_ENTITY_ENVELOPE_SCHEMA.
   */
  readonly data: JsonObject;
}

const MISSING = Symbol("missing");

type Missing = typeof MISSING;

type MaybeJsonValue = JsonValue | Missing;

interface JsonMergeResult {
  readonly value: MaybeJsonValue;
  readonly conflictingPaths: readonly string[];
}

interface JsonObjectMergeResult {
  readonly value: JsonObject;
  readonly conflictingPaths: readonly string[];
}

const syncEnvelopeFields = new Set<string>(
  Object.keys(SYNC_ENTITY_ENVELOPE_SCHEMA),
);

export function resolveSyncConflict(
  conflict: SyncConflictCandidate,
): SyncConflictResolution {
  /*
   * Only true divergence can currently be automatically resolved.
   *
   * A missing remote record or malformed mutation chain needs an explicit
   * policy rather than an automatic field merge.
   */
  if (
    conflict.reason !== "diverged" ||
    conflict.basePayloadJson === null ||
    conflict.remotePayloadJson === null ||
    conflict.pendingMutations.length === 0
  ) {
    return unresolved(conflict, ["$record"]);
  }

  let currentRemote = parsePayload(conflict.remotePayloadJson);

  const rewrittenMutations: SyncMutation[] = [];

  /*
   * Reapply each local mutation in its original order.
   *
   * We do not collapse the whole chain into one mutation because preserving
   * the chain retains operation ordering and makes acknowledgements precise.
   */
  for (const mutation of conflict.pendingMutations) {
    if (
      mutation.localSequence === undefined ||
      mutation.basePayloadJson === null
    ) {
      return unresolved(conflict, ["$chain"]);
    }

    const originalBase = parsePayload(mutation.basePayloadJson);

    const originalLocal = parsePayload(mutation.payloadJson);

    const merge = mergeEntityChange(originalBase, originalLocal, currentRemote);

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

    const nextEntity: SyncEntityPayload = {
      ...merge.entity,

      revision: currentRemote.revision + 1,
      lastMutationId: mutationId,

      /*
       * Keep the timestamp associated with the original local operation.
       * It remains informational and never decides the conflict.
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
    entityType: conflict.entityType,
    entityId: conflict.entityId,
    finalEntity: currentRemote,
    rewrittenMutations,
    replacedMutationIds: conflict.pendingMutations.map(
      ({ mutationId }) => mutationId,
    ),
  };
}

function parseSyncEntityPayload(value: unknown): SyncEntityPayload {
  if (!isJsonObject(value)) {
    throw new Error("Synchronization payload must be a JSON object");
  }

  for (const [field, descriptor] of Object.entries(
    SYNC_ENTITY_ENVELOPE_SCHEMA,
  )) {
    if (
      !validateEnvelopeField(
        descriptor as SyncEnvelopeFieldDescriptor,
        value[field],
      )
    ) {
      throw new Error(`Synchronization payload has an invalid ${field} value`);
    }
  }

  return value as SyncEntityPayload;
}

function validateEnvelopeField(
  descriptor: SyncEnvelopeFieldDescriptor,
  value: unknown,
): boolean {
  switch (descriptor) {
    case "string":
      return typeof value === "string";

    case "nullable-string":
      return value === null || typeof value === "string";

    case "nullable-revision":
      return (
        value === null ||
        (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
      );

    default: {
      return descriptor;
    }
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeEntityChange(
  base: SyncEntityPayload,
  local: SyncEntityPayload,
  remote: SyncEntityPayload,
): EntityMergeResult {
  const baseParts = splitEntity(base);
  const localParts = splitEntity(local);
  const remoteParts = splitEntity(remote);

  /*
   * Entity identity and creation metadata are immutable.
   */
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

  const dataMerge = mergeJsonObjects(
    baseParts.data,
    localParts.data,
    remoteParts.data,
  );

  const conflictingFields = [...dataMerge.conflictingPaths];

  const localBusinessChanged = !jsonEquals(baseParts.data, localParts.data);

  const remoteBusinessChanged = !jsonEquals(baseParts.data, remoteParts.data);

  const localDeleted = base.deletedAt === null && local.deletedAt !== null;

  const remoteDeleted = base.deletedAt === null && remote.deletedAt !== null;

  /*
   * A delete racing against a business-data edit is not automatically safe.
   *
   * Examples:
   * - local deletes while remote changes the amount;
   * - remote deletes while local changes the description.
   */
  if (
    (localDeleted && remoteBusinessChanged) ||
    (remoteDeleted && localBusinessChanged)
  ) {
    conflictingFields.push("deletedAt");
  }

  let deletedAt: string | null;

  if (localDeleted) {
    deletedAt = local.deletedAt;
  } else if (remoteDeleted) {
    deletedAt = remote.deletedAt;
  } else {
    /*
     * Covers ordinary non-deleted entities and entities that were already
     * tombstones in the common base.
     */
    deletedAt = remote.deletedAt;
  }

  const entity: SyncEntityPayload = {
    /*
     * Generic business fields.
     */
    ...dataMerge.value,

    /*
     * The synchronization envelope is written last so business data cannot
     * accidentally override protocol-managed properties.
     */
    id: remote.id,
    createdAt: remote.createdAt,
    updatedAt: remote.updatedAt,
    deletedAt,
    revision: remote.revision,
    lastMutationId: remote.lastMutationId,
  };

  return {
    entity,
    conflictingFields: [...new Set(conflictingFields)],
  };
}

function splitEntity(entity: SyncEntityPayload): SplitSyncEntity {
  const dataEntries = Object.entries(entity).filter(
    ([field]) => !syncEnvelopeFields.has(field),
  );

  return {
    data: Object.fromEntries(dataEntries) as JsonObject,
  };
}

function mergeJsonObjects(
  base: JsonObject,
  local: JsonObject,
  remote: JsonObject,
  parentPath = "",
): JsonObjectMergeResult {
  const keys = new Set([
    ...Object.keys(base),
    ...Object.keys(local),
    ...Object.keys(remote),
  ]);

  const merged: Record<string, JsonValue> = {};
  const conflictingPaths: string[] = [];

  for (const key of keys) {
    const path = parentPath ? `${parentPath}.${key}` : key;

    const result = mergeJsonValue(
      readValue(base, key),
      readValue(local, key),
      readValue(remote, key),
      path,
    );

    conflictingPaths.push(...result.conflictingPaths);

    /*
     * MISSING means that the property was removed by the selected side.
     */
    if (result.value !== MISSING) {
      merged[key] = result.value;
    }
  }

  return {
    value: merged,
    conflictingPaths,
  };
}

function mergeJsonValue(
  base: MaybeJsonValue,
  local: MaybeJsonValue,
  remote: MaybeJsonValue,
  path: string,
): JsonMergeResult {
  /*
   * Both sides produced the same final value.
   */
  if (jsonEquals(local, remote)) {
    return {
      value: local,
      conflictingPaths: [],
    };
  }

  /*
   * Local did not change the value, so use remote.
   */
  if (jsonEquals(local, base)) {
    return {
      value: remote,
      conflictingPaths: [],
    };
  }

  /*
   * Remote did not change the value, so use local.
   */
  if (jsonEquals(remote, base)) {
    return {
      value: local,
      conflictingPaths: [],
    };
  }

  /*
   * Both sides changed an object. Try merging individual nested properties.
   *
   * When the property did not exist in the base, both sides independently
   * created an object, so an empty object acts as their common base.
   */
  if (
    (base === MISSING || isJsonObject(base)) &&
    isJsonObject(local) &&
    isJsonObject(remote)
  ) {
    return mergeJsonObjects(base === MISSING ? {} : base, local, remote, path);
  }

  /*
   * Primitive values and arrays are atomic.
   *
   * Safe array merging would require domain-specific item identity and
   * ordering rules, so conflicting array edits remain unresolved.
   */
  return {
    value: remote,
    conflictingPaths: [path || "$"],
  };
}

function readValue(object: JsonObject, key: string): MaybeJsonValue {
  return Object.prototype.hasOwnProperty.call(object, key)
    ? object[key]
    : MISSING;
}

function jsonEquals(left: MaybeJsonValue, right: MaybeJsonValue): boolean {
  if (left === MISSING || right === MISSING) {
    return left === right;
  }

  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => jsonEquals(value, right[index]))
    );
  }

  if (isJsonObject(left) && isJsonObject(right)) {
    const leftKeys = Object.keys(left);

    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(right, key) &&
          jsonEquals(left[key], right[key]),
      )
    );
  }

  return false;
}

function parsePayload(payloadJson: string): SyncEntityPayload {
  const value: unknown = JSON.parse(payloadJson);

  return parseSyncEntityPayload(value);
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

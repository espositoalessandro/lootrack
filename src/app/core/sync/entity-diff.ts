import {
  EntityFieldChange,
  RemoteEntity,
  SyncOperation,
} from "../models/models";

const IGNORED_FIELDS = new Set([
  "id",
  "revision",
  "lastMutationId",
  "createdAt",
  "updatedAt",
  "deletedAt",
]);

export interface EntityDiff {
  readonly kind: "created" | "updated" | "deleted";
  readonly before: RemoteEntity | null;
  readonly after: RemoteEntity;
  readonly fields: readonly EntityFieldChange[];
}

export function diffEntityPayloads(
  beforeJson: string | null,
  afterJson: string,
  operation: SyncOperation,
): EntityDiff {
  const before = beforeJson ? (JSON.parse(beforeJson) as RemoteEntity) : null;

  const after = JSON.parse(afterJson) as RemoteEntity;

  const kind =
    before === null
      ? "created"
      : operation === "delete"
        ? "deleted"
        : "updated";

  if (kind !== "updated") {
    return {
      kind,
      before,
      after,
      fields: [],
    };
  }

  const fields: EntityFieldChange[] = [];

  for (const field of Object.keys(after)) {
    if (IGNORED_FIELDS.has(field)) {
      continue;
    }

    const beforeValue = (before as unknown as Record<string, unknown>)[field];
    const afterValue = (after as unknown as Record<string, unknown>)[field];

    if (!valuesEqual(beforeValue, afterValue)) {
      fields.push({
        field,
        before: beforeValue,
        after: afterValue,
      });
    }
  }

  return {
    kind,
    before,
    after,
    fields,
  };
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

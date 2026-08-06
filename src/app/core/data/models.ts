/************************** SYNC **************************************/

export interface Entity extends SyncMetadata {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

type RuntimeFieldValidator<T> = (value: unknown) => value is T;

const isString: RuntimeFieldValidator<string> = (value): value is string =>
  typeof value === "string";

const isNullableString: RuntimeFieldValidator<string | null> = (
  value,
): value is string | null => value === null || typeof value === "string";

const isNullableRevision: RuntimeFieldValidator<number | null> = (
  value,
): value is number | null =>
  value === null ||
  (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);

/**
 * Runtime contract for the fields managed by the synchronization system.
 * Business fields are intentionally absent and are handled generically.
 */
export const SYNC_ENTITY_ENVELOPE_SCHEMA = {
  id: isString,
  createdAt: isString,
  updatedAt: isString,
  deletedAt: isNullableString,
  revision: isNullableRevision,
  lastMutationId: isNullableString,
} satisfies {
  [Key in keyof Entity]-?: RuntimeFieldValidator<Entity[Key]>;
};

export type SyncEntityPayload = Entity & JsonObject;

export type SyncEntityType = "transaction" | "category";
export type SyncOperation = "upsert" | "delete";

export interface SyncMetadata {
  revision: number | null;
  lastMutationId: string | null;
}

export interface SyncMutation {
  localSequence?: number;
  mutationId: string;

  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  // expected remote values
  expectedRevision: number | null;
  expectedMutationId: string | null;
  basePayloadJson: string | null;

  payloadJson: string;
  createdAt: string;
}

export type OutgoingSyncMutation = Omit<SyncMutation, "localSequence">;

export interface RemoteSyncRecord {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;

  revision: number;
  mutationId: string;
  payloadJson: string;
}

export interface RemoteSyncSnapshot {
  records: readonly RemoteSyncRecord[];
}

export interface SyncPushRequest {
  mutations: readonly OutgoingSyncMutation[];
}

export interface SyncPushResult {
  records: readonly RemoteSyncRecord[];
}

export interface SyncTarget {
  id: "active";
  remoteId: string;
}

export interface SyncProvider {
  initialize(): Promise<void>;
  isConnected(): boolean;
  connect(): Promise<void>;
  pull(): Promise<RemoteSyncSnapshot>;
  push(request: SyncPushRequest): Promise<SyncPushResult>;
  disconnect(): Promise<void>;
}

/************************** ENTITIES **************************************/

export interface AppSettings {
  id: "app";
  currency: string;
  locale: string;
  theme: "light" | "dark";
  language: string;
}

export type AppSettingsPatch = Partial<Omit<AppSettings, "id">>;

export type TransactionType = "expense" | "income";

export interface Transaction extends Entity {
  type: TransactionType;
  amountInCents: number;
  description: string;
  occurredOn: string;
  categoryId: string | null;
}

export type CategoryAssignment =
  | {
      kind: "categorized";
      categoryId: string;
    }
  | {
      kind: "uncategorized";
    };

export interface AddTransaction {
  type: TransactionType;
  category: CategoryAssignment;
  amountInCents: number;
  description: string;
  occurredOn: string;
}
export type UpdateTransaction = AddTransaction;

export interface Category extends Entity {
  type: TransactionType;
  name: string;
}

export interface AddCategory {
  name: string;
  type: TransactionType;
  transactionIds?: string[];
}

export interface UpdateCategory {
  name: string;
  type: TransactionType;
  transactionIds?: string[];
}

export interface CategoryMutationResult {
  category: Category;
  transactions?: Transaction[];
}

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

export type SyncEnvelopeFieldDescriptor =
  "string" | "nullable-string" | "nullable-revision";

type IsExactly<T, Expected> = [T] extends [Expected]
  ? [Expected] extends [T]
    ? true
    : false
  : false;

type DescriptorFor<T> =
  IsExactly<T, string> extends true
    ? "string"
    : IsExactly<T, string | null> extends true
      ? "nullable-string"
      : IsExactly<T, number | null> extends true
        ? "nullable-revision"
        : never;

/**
 * Declarative runtime description of synchronization-managed fields.
 * No validation logic belongs in this file.
 */
export const SYNC_ENTITY_ENVELOPE_SCHEMA = {
  id: "string",
  createdAt: "string",
  updatedAt: "string",
  deletedAt: "nullable-string",
  revision: "nullable-revision",
  lastMutationId: "nullable-string",
} as const satisfies {
  [Key in keyof Entity]-?: DescriptorFor<Entity[Key]>;
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

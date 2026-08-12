/************************** SYNC **************************************/

export type SyncEntityType = "transaction" | "category";
export type SyncOperation = "upsert" | "delete";

export interface SyncMetadata {
  revision: number | null;
  lastMutationId: string | null;
}

export interface SyncMutation {
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
  mutations: readonly SyncMutation[];
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

export interface LocalSyncSnapshot {
  readonly transactions: readonly Transaction[];
  readonly categories: readonly Category[];
  readonly mutations: readonly SyncMutation[];
}

export interface LocalSyncChanges {
  readonly remoteRecords: readonly RemoteSyncRecord[];
  readonly mutationIdsToAcknowledge: readonly string[];
}

export type RemoteEntity = Transaction | Category;

export type SyncConflictReason =
  "diverged" | "remote-missing" | "invalid-local-chain";

export interface SyncConflictCandidate {
  readonly entityType: SyncEntityType;
  readonly entityId: string;
  readonly reason: SyncConflictReason;

  readonly basePayloadJson: string | null;
  readonly localPayloadJson: string;
  readonly remotePayloadJson: string | null;

  readonly pendingMutations: readonly SyncMutation[];
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
  readonly mutationsToPush: readonly SyncMutation[];

  /**
   * Mutations already represented by the remote final state, usually after
   * a previous push succeeded but its acknowledgement was lost.
   */
  readonly mutationIdsToAcknowledge: readonly string[];

  /**
   * Divergent entities requiring explicit user resolution.
   */
  readonly conflicts: readonly SyncConflictCandidate[];
}

/************************** ENTITIES **************************************/

export interface Entity extends SyncMetadata {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

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

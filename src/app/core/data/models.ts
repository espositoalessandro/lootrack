export type SyncEntityType = "transaction" | "category" | "settings";
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

export interface AppSettings {
  id: "app";
  currency: string;
  locale: string;
  theme: "light" | "dark";
  language: string;
}

export type AppSettingsPatch = Partial<Omit<AppSettings, "id">>;

export type TransactionType = "expense" | "income";

export interface Entity extends SyncMetadata {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

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

export type OutgoingSyncMutation = Omit<SyncMutation, "localSequence">;

export interface RemoteSyncRecord {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;

  revision: number;
  mutationId: string;
  payloadJson: string;
}

export interface SyncExchangeRequest {
  sinceRevision: number;
  mutations: readonly OutgoingSyncMutation[];
}

export type SyncMutationOutcome = "applied" | "duplicate" | "conflict";

export interface SyncMutationResult {
  mutationId: string;
  outcome: SyncMutationOutcome;
  remoteRecord: RemoteSyncRecord;
}

export interface SyncExchangeResult {
  latestRevision: number;
  changes: readonly RemoteSyncRecord[];
  mutationResults: readonly SyncMutationResult[];
}

export interface SyncProvider {
  initialize(): Promise<void>;
  connect(): Promise<void>;
  exchange(request: SyncExchangeRequest): Promise<SyncExchangeResult>;
  disconnect(): Promise<void>;
}

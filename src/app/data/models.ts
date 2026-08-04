export interface AppSettings {
  id: "app";
  currency: string;
  locale: string;
  theme: "light" | "dark";
  language: string;
}

export type AppSettingsPatch = Partial<Omit<AppSettings, "id">>;

export type SyncEntityType = "transaction" | "category" | "settings";

export type SyncOperation = "upsert" | "delete";

export interface Mutation {
  mutationId: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payloadJson: string;
  createdAt: string;
}

export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  type: TransactionType;
  amountInCents: number;
  description: string;
  occurredOn: string;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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

export interface Category {
  id: string;
  type: TransactionType;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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
  transactions: Transaction[];
}

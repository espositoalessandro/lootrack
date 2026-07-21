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

export interface AddTransaction {
  type: TransactionType;
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
}

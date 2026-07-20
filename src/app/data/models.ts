export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  type: TransactionType;
  amountInCents: number;
  description: string;
  occurredOn: string;
  createdAt: string;
}

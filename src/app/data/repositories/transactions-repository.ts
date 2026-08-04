import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import {
  AddTransaction,
  CategoryAssignment,
  Transaction,
  TransactionType,
} from "../models";
import { lootrackDb } from "../database";
import {
  InvalidCategoryReferenceError,
  InvalidTransactionError,
} from "../errors";

@Injectable({
  providedIn: "root",
})
export class TransactionsRepository {
  getActive(): Observable<Transaction[]> {
    return defer(() =>
      lootrackDb.transactions
        .filter((transaction) => transaction.deletedAt === null)
        .toArray(),
    );
  }

  add(input: AddTransaction): Observable<Transaction> {
    return defer(() =>
      lootrackDb.transaction(
        "rw",
        lootrackDb.categories,
        lootrackDb.transactions,
        lootrackDb.mutations,
        async () => {
          const categoryId = this.resolveCategoryId(input.category);

          await this.validateCategoryReference(categoryId, input.type);

          const now = new Date().toISOString();
          const transaction: Transaction = {
            id: crypto.randomUUID(),
            type: input.type,
            amountInCents: input.amountInCents,
            description: input.description,
            occurredOn: input.occurredOn,
            categoryId,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };

          await lootrackDb.transactions.add(transaction);
          await lootrackDb.mutations.add({
            mutationId: crypto.randomUUID(),
            entityType: "transaction",
            entityId: transaction.id,
            operation: "upsert",
            payloadJson: JSON.stringify(transaction),
            createdAt: now,
          });
          return transaction;
        },
      ),
    );
  }

  remove(id: string): Observable<string> {
    return defer(() =>
      lootrackDb.transaction(
        "rw",
        lootrackDb.transactions,
        lootrackDb.mutations,
        async () => {
          const existing = await lootrackDb.transactions.get(id);

          if (!existing || existing.deletedAt !== null) {
            throw new Error("Transaction not found");
          }

          const now = new Date().toISOString();
          const deletedTransaction: Transaction = {
            ...existing,
            deletedAt: now,
            updatedAt: now,
          };

          await lootrackDb.transactions.put(deletedTransaction);
          await lootrackDb.mutations.add({
            mutationId: crypto.randomUUID(),
            entityType: "transaction",
            entityId: id,
            operation: "delete",
            payloadJson: JSON.stringify(deletedTransaction),
            createdAt: now,
          });

          return deletedTransaction.id;
        },
      ),
    );
  }

  update(id: string, changes: AddTransaction): Observable<Transaction> {
    return defer(() =>
      lootrackDb.transaction(
        "rw",
        lootrackDb.categories,
        lootrackDb.transactions,
        lootrackDb.mutations,
        async () => {
          const existing = await lootrackDb.transactions.get(id);

          if (!existing || existing.deletedAt !== null) {
            throw new Error("Transaction not found");
          }

          const categoryId = this.resolveCategoryId(changes.category);
          await this.validateCategoryReference(categoryId, changes.type);
          const now = new Date().toISOString();
          const updatedTransaction: Transaction = {
            ...existing,
            type: changes.type,
            amountInCents: changes.amountInCents,
            description: changes.description,
            occurredOn: changes.occurredOn,
            categoryId,
            updatedAt: now,
          };

          await lootrackDb.transactions.put(updatedTransaction);
          await lootrackDb.mutations.add({
            mutationId: crypto.randomUUID(),
            entityType: "transaction",
            entityId: id,
            operation: "upsert",
            payloadJson: JSON.stringify(updatedTransaction),
            createdAt: now,
          });

          return updatedTransaction;
        },
      ),
    );
  }

  private resolveCategoryId(assignment: CategoryAssignment): string | null {
    switch (assignment.kind) {
      case "categorized":
        return assignment.categoryId;

      case "uncategorized":
        return null;

      default:
        throw new InvalidTransactionError("Invalid category assignment");
    }
  }

  private async validateCategoryReference(
    categoryId: string | null,
    transactionType: TransactionType,
  ): Promise<void> {
    if (categoryId === null) {
      return;
    }

    const category = await lootrackDb.categories.get(categoryId);

    if (!category) {
      throw new InvalidCategoryReferenceError(categoryId, "not-found");
    }

    if (category.deletedAt !== null) {
      throw new InvalidCategoryReferenceError(categoryId, "deleted");
    }

    if (category.type !== transactionType) {
      throw new InvalidCategoryReferenceError(categoryId, "type-mismatch");
    }
  }
}

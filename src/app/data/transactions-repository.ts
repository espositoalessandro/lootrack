import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import { AddTransaction, Transaction } from "./models";
import { lootrackDb } from "./database";
import {
  InvalidCategoryReferenceError,
  InvalidTransactionError,
} from "./errors";

function assertValidCategoryId(value: unknown): asserts value is string | null {
  if (value !== null && typeof value !== "string") {
    throw new InvalidTransactionError(
      "categoryId must be a UUID string or null",
    );
  }
}

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
    return defer(async () => {
      const categoryId =
        input.category.kind === "categorized"
          ? input.category.categoryId
          : null;

      assertValidCategoryId(categoryId);
      await this.validateCategoryReference(input);

      const transaction: Transaction = {
        ...input,
        categoryId,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await lootrackDb.transactions.add(transaction);
      return transaction;
    });
  }

  remove(id: string): Observable<string> {
    return defer(async () => {
      const existing = await lootrackDb.transactions.get(id);

      if (!existing || existing.deletedAt !== null) {
        throw new Error("Transaction not found");
      }

      const deletedTransaction: Transaction = {
        ...existing,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await lootrackDb.transactions.put(deletedTransaction);

      return deletedTransaction.id;
    });
  }

  update(id: string, changes: AddTransaction): Observable<Transaction> {
    return defer(async () => {
      const existing = await lootrackDb.transactions.get(id);

      if (!existing || existing.deletedAt !== null) {
        throw new Error("Transaction not found");
      }
      const categoryId =
        changes.category.kind === "categorized"
          ? changes.category.categoryId
          : null;

      assertValidCategoryId(categoryId);
      await this.validateCategoryReference(changes);

      const updatedTransaction: Transaction = {
        ...existing,
        ...changes,
        updatedAt: new Date().toISOString(),
      };

      await lootrackDb.transactions.put(updatedTransaction);

      return updatedTransaction;
    });
  }

  // helpers

  private async validateCategoryReference(
    input: AddTransaction,
  ): Promise<void> {
    if (input.category === null || input.category.kind !== "categorized") {
      return;
    }

    const category = await lootrackDb.categories.get(input.category.categoryId);

    if (!category) {
      throw new InvalidCategoryReferenceError(
        input.category.categoryId,
        "not-found",
      );
    }

    if (category.deletedAt !== null) {
      throw new InvalidCategoryReferenceError(
        input.category.categoryId,
        "deleted",
      );
    }

    if (category.type !== input.type) {
      throw new InvalidCategoryReferenceError(
        input.category.categoryId,
        "type-mismatch",
      );
    }
  }
}

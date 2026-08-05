import { inject, Injectable } from "@angular/core";
import { defer, firstValueFrom, Observable } from "rxjs";
import {
  AddTransaction,
  CategoryAssignment,
  SyncMetadata,
  Transaction,
  TransactionType,
  UpdateTransaction,
} from "../models";
import { lootrackDb } from "../database";
import {
  InvalidCategoryReferenceError,
  InvalidTransactionError,
} from "../errors";
import { MutationsRepository } from "./mutations-repository";

@Injectable({
  providedIn: "root",
})
export class TransactionsRepository {
  private readonly mutationsRepository = inject(MutationsRepository);

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
          const transaction: Omit<Transaction, keyof SyncMetadata> = {
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

          const { entity } = await firstValueFrom(
            this.mutationsRepository.add({
              nextEntityData: transaction,
              operation: "upsert",
              entityType: "transaction",
              timestamp: now,
              previousEntity: null,
            }),
          );

          await lootrackDb.transactions.add(entity);
          return entity;
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
          const deletedTransaction: Omit<Transaction, keyof SyncMetadata> = {
            id: existing.id,
            type: existing.type,
            amountInCents: existing.amountInCents,
            description: existing.description,
            occurredOn: existing.occurredOn,
            categoryId: existing.categoryId,
            createdAt: existing.createdAt,
            updatedAt: now,
            deletedAt: now,
          };

          const { entity } = await firstValueFrom(
            this.mutationsRepository.add({
              nextEntityData: deletedTransaction,
              operation: "delete",
              entityType: "transaction",
              timestamp: now,
              previousEntity: existing,
            }),
          );

          await lootrackDb.transactions.put(entity);
          return entity.id;
        },
      ),
    );
  }

  update(id: string, changes: UpdateTransaction): Observable<Transaction> {
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
          const updatedTransaction: Omit<Transaction, keyof SyncMetadata> = {
            id: existing.id,
            type: changes.type,
            amountInCents: changes.amountInCents,
            description: changes.description,
            occurredOn: changes.occurredOn,
            categoryId,
            createdAt: existing.createdAt,
            updatedAt: now,
            deletedAt: existing.deletedAt,
          };

          const { entity } = await firstValueFrom(
            this.mutationsRepository.add({
              entityType: "transaction",
              operation: "upsert",
              timestamp: now,
              previousEntity: existing,
              nextEntityData: updatedTransaction,
            }),
          );
          await lootrackDb.transactions.put(entity);
          return entity;
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

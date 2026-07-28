import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import {
  AddCategory,
  Category,
  CategoryMutationResult,
  Transaction,
  UpdateCategory,
} from "../models";
import { lootrackDb } from "../database";
import { categoryNamesMatch, cleanCategoryName } from "../category-name";
import {
  CategoryAlreadyExistsError,
  CategoryInUseError,
  CategoryTransactionAssignmentError,
  CategoryTypeChangeBlockedError,
} from "../errors";

@Injectable({
  providedIn: "root",
})
export class CategoriesRepository {
  getActive(): Observable<Category[]> {
    return defer(() =>
      lootrackDb.categories
        .filter((category) => category.deletedAt === null)
        .toArray(),
    );
  }

  add(input: AddCategory): Observable<CategoryMutationResult> {
    return defer(() =>
      lootrackDb.transaction(
        "rw",
        lootrackDb.categories,
        lootrackDb.transactions,
        async () => {
          const categories = await lootrackDb.categories.toArray();
          const existing = categories.find(
            (category) =>
              category.type === input.type &&
              categoryNamesMatch(category.name, input.name) &&
              category.deletedAt === null,
          );

          if (existing) {
            throw new CategoryAlreadyExistsError(
              `An ${input.type} category named "${cleanCategoryName(
                input.name,
              )}" already exists`,
            );
          }

          const transactions = await this.getAssignableTransactions(
            input.transactionIds,
            input.type,
          );
          const now = new Date().toISOString();
          const category: Category = {
            id: crypto.randomUUID(),
            name: cleanCategoryName(input.name),
            type: input.type,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };
          const updatedTransactions = transactions.map((transaction) => ({
            ...transaction,
            categoryId: category.id,
            updatedAt: now,
          }));

          await lootrackDb.categories.add(category);

          if (updatedTransactions.length > 0) {
            await lootrackDb.transactions.bulkPut(updatedTransactions);
          }
          return { category, transactions: updatedTransactions };
        },
      ),
    );
  }
  remove(id: string): Observable<string> {
    return defer(() =>
      lootrackDb.transaction(
        "rw",
        lootrackDb.categories,
        lootrackDb.transactions,
        async () => {
          const category = await lootrackDb.categories.get(id);

          if (!category || category.deletedAt !== null) {
            throw new Error("Category not found");
          }

          const activeTransactionCount = await lootrackDb.transactions
            .where("categoryId")
            .equals(id)
            .and((transaction) => transaction.deletedAt === null)
            .count();

          if (activeTransactionCount > 0) {
            throw new CategoryInUseError(activeTransactionCount);
          }

          const now = new Date().toISOString();

          await lootrackDb.categories.update(id, {
            deletedAt: now,
            updatedAt: now,
          });

          return id;
        },
      ),
    );
  }

  update(
    id: string,
    input: UpdateCategory,
  ): Observable<CategoryMutationResult> {
    return defer(() =>
      lootrackDb.transaction(
        "rw",
        lootrackDb.categories,
        lootrackDb.transactions,
        async () => {
          const existing = await lootrackDb.categories.get(id);
          if (!existing || existing.deletedAt !== null) {
            throw new Error("Category not found");
          }

          const typeChanged = input.type !== existing.type;

          if (typeChanged) {
            const activeTransactionCount = await lootrackDb.transactions
              .where("categoryId")
              .equals(id)
              .and((transaction) => transaction.deletedAt === null)
              .count();

            if (activeTransactionCount > 0) {
              throw new CategoryTypeChangeBlockedError(activeTransactionCount);
            }
          }

          const duplicate = await lootrackDb.categories
            .filter(
              (category) =>
                category.id !== id &&
                category.type === input.type &&
                category.deletedAt === null &&
                categoryNamesMatch(category.name, input.name),
            )
            .first();

          if (duplicate) {
            throw new CategoryAlreadyExistsError(
              `An ${input.type} category named "${cleanCategoryName(
                input.name,
              )}" already exists`,
            );
          }

          const transactions = await this.getAssignableTransactions(
            input.transactionIds,
            input.type,
          );

          const now = new Date().toISOString();

          const updatedCategory: Category = {
            ...existing,
            name: cleanCategoryName(input.name),
            type: input.type,
            updatedAt: now,
          };

          const updatedTransactions: Transaction[] = transactions.map(
            (transaction) => ({
              ...transaction,
              categoryId: updatedCategory.id,
              updatedAt: now,
            }),
          );

          await lootrackDb.categories.put(updatedCategory);

          if (updatedTransactions.length > 0) {
            await lootrackDb.transactions.bulkPut(updatedTransactions);
          }

          return {
            category: updatedCategory,
            transactions: updatedTransactions,
          };
        },
      ),
    );
  }

  private async getAssignableTransactions(
    transactionIds: readonly string[] | undefined,
    targetType: Category["type"],
  ): Promise<Transaction[]> {
    const uniqueTransactionIds = [...new Set(transactionIds ?? [])];

    if (uniqueTransactionIds.length === 0) {
      return [];
    }

    const transactionResults =
      await lootrackDb.transactions.bulkGet(uniqueTransactionIds);

    if (transactionResults.some((transaction) => transaction === undefined)) {
      throw new CategoryTransactionAssignmentError(
        "Some selected transactions were not found",
      );
    }

    const transactions = transactionResults.filter(
      (transaction): transaction is Transaction => transaction !== undefined,
    );

    for (const transaction of transactions) {
      if (transaction.deletedAt !== null) {
        throw new CategoryTransactionAssignmentError(
          `Transaction of ${transaction.occurredOn} has been deleted`,
        );
      }

      if (transaction.categoryId !== null) {
        throw new CategoryTransactionAssignmentError(
          `Transaction of ${transaction.occurredOn} already has a category`,
        );
      }

      if (transaction.type !== targetType) {
        throw new CategoryTransactionAssignmentError(
          `Transaction of ${transaction.occurredOn} has a different type`,
        );
      }
    }

    return transactions;
  }
}

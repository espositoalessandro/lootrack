import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import { AddCategory, Category, Transaction } from "./models";
import { lootrackDb } from "./database";
import { categoryNamesMatch, cleanCategoryName } from "./category-name";
import {
  CategoryAlreadyExistsError,
  CategoryInUseError,
  EditTransactionOnCategoryCreateError,
} from "./errors";

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

  add(
    input: AddCategory,
  ): Observable<{ category: Category; transactions: Transaction[] }> {
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

          // remove duplicates
          const transactionIds = [...new Set(input.transactionIds ?? [])];

          const transactionResults =
            await lootrackDb.transactions.bulkGet(transactionIds);

          if (
            transactionResults.some((transaction) => transaction === undefined)
          ) {
            throw new EditTransactionOnCategoryCreateError(
              "Some selected transactions were not found",
            );
          }

          const transactions = transactionResults.filter(
            (transaction): transaction is Transaction =>
              transaction !== undefined,
          );

          for (const transaction of transactions) {
            if (transaction.deletedAt !== null) {
              throw new EditTransactionOnCategoryCreateError(
                `Transaction of ${transaction.occurredOn} has been deleted`,
              );
            }

            if (transaction.categoryId !== null) {
              throw new EditTransactionOnCategoryCreateError(
                `Transaction of ${transaction.occurredOn} already has a category`,
              );
            }

            if (transaction.type !== input.type) {
              throw new EditTransactionOnCategoryCreateError(
                `Transaction of ${transaction.occurredOn} has a different type`,
              );
            }
          }

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

  updateName(id: string, name: string): Observable<Category> {
    return defer(async () => {
      const existing = await lootrackDb.categories.get(id);

      if (!existing || existing.deletedAt !== null) {
        throw new Error("Category not found");
      }

      const duplicate = await lootrackDb.categories
        .filter(
          (category) =>
            category.id !== id &&
            category.type === existing.type &&
            category.deletedAt === null &&
            categoryNamesMatch(category.name, name),
        )
        .first();

      if (duplicate) {
        throw new Error(
          `An ${existing.type} category named "${cleanCategoryName(name)}" already exists`,
        );
      }

      const updatedCategory: Category = {
        ...existing,
        name: cleanCategoryName(name),
        updatedAt: new Date().toISOString(),
      };

      await lootrackDb.categories.put(updatedCategory);

      return updatedCategory;
    });
  }
}

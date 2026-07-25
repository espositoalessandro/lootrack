import { inject, Injectable } from "@angular/core";
import { catchError, concatMap, defer, from, Observable, of } from "rxjs";
import { AddCategory, Category } from "./models";
import { lootrackDb } from "./database";
import { categoryNamesMatch, cleanCategoryName } from "./category-name";
import {
  CategoryAlreadyExistsError,
  CategoryInUseError,
  EditTransactionOnCategoryCreateError,
} from "./errors";
import { TransactionsRepository } from "./transactions-repository";

@Injectable({
  providedIn: "root",
})
export class CategoriesRepository {
  private readonly transactionRepo = inject(TransactionsRepository);

  getActive(): Observable<Category[]> {
    return defer(() =>
      lootrackDb.categories
        .filter((category) => category.deletedAt === null)
        .toArray(),
    );
  }

  getAllIncludingDeleted(): Observable<Category[]> {
    return defer(() => lootrackDb.categories.toArray());
  }

  add(input: AddCategory): Observable<Category> {
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
              `An ${input.type} category named "${cleanCategoryName(input.name)}" already exists`,
            );
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

          await lootrackDb.categories.add(category);

          if (input.transactionIds && input.transactionIds.length > 0) {
            let transactions = await lootrackDb.transactions.toArray();
            transactions = transactions.filter((transaction) => {
              return input.transactionIds!.includes(transaction.id);
            });
            if (transactions.length !== input.transactionIds!.length) {
              throw new EditTransactionOnCategoryCreateError(
                "Some transactions were not found",
              );
            }
            transactions.forEach((transaction) => {
              if (transaction.categoryId !== null) {
                throw new EditTransactionOnCategoryCreateError(
                  `Transaction of ${transaction.occurredOn} already has a category`,
                );
              }
            });

            from(transactions).pipe(
              concatMap((transaction) =>
                this.transactionRepo.update(transaction.id, {
                  category: { categoryId: category.id, kind: "categorized" },
                  type: transaction.type,
                  amountInCents: transaction.amountInCents,
                  description: transaction.description,
                  occurredOn: transaction.occurredOn,
                }),
              ),
              catchError(() => of(new EditTransactionOnCategoryCreateError())),
            );
          }
          return category;
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

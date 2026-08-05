import { inject, Injectable } from "@angular/core";
import { defer, firstValueFrom, Observable } from "rxjs";
import {
  AddCategory,
  Category,
  CategoryMutationResult,
  SyncMetadata,
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
import {
  CreateMutationPayload,
  MutationsRepository,
} from "./mutations-repository";

@Injectable({
  providedIn: "root",
})
export class CategoriesRepository {
  private readonly mutationsRepository = inject(MutationsRepository);

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
        lootrackDb.mutations,
        async () => {
          // 1. check that a category with the same name and type doesn't exist
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

          // 2. create and insert the new category
          const now = new Date().toISOString();
          const categoryData: Omit<Category, keyof SyncMetadata> = {
            id: crypto.randomUUID(),
            name: cleanCategoryName(input.name),
            type: input.type,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          };

          const { entity: category } = await firstValueFrom(
            this.mutationsRepository.add({
              entityType: "category",
              operation: "upsert",
              timestamp: now,
              previousEntity: null,
              nextEntityData: categoryData,
            }),
          );

          await lootrackDb.categories.add(category);

          // 3. edit assigned transactions, if present, with the new category
          const assignableTransactions = await this.getAssignableTransactions(
            input.transactionIds,
            input.type,
          );

          if (assignableTransactions.length > 0) {
            const transactions = await this.addTransactionsMutations(
              category,
              assignableTransactions,
              now,
            );
            await lootrackDb.transactions.bulkPut(transactions);
            return { category, transactions: transactions };
          }

          return { category };
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
        lootrackDb.mutations,
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
          const deletedCategory: Omit<Category, keyof SyncMetadata> = {
            id: category.id,
            name: category.name,
            type: category.type,
            createdAt: category.createdAt,
            updatedAt: now,
            deletedAt: now,
          };

          const { entity } = await firstValueFrom(
            this.mutationsRepository.add({
              entityType: "category",
              operation: "delete",
              timestamp: now,
              previousEntity: category,
              nextEntityData: deletedCategory,
            }),
          );

          await lootrackDb.categories.put(entity);
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
        lootrackDb.mutations,
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

          const now = new Date().toISOString();

          const updatedCategory: Omit<Category, keyof SyncMetadata> = {
            id: existing.id,
            name: cleanCategoryName(input.name),
            type: input.type,
            createdAt: existing.createdAt,
            updatedAt: now,
            deletedAt: existing.deletedAt,
          };

          const { entity: category } = await firstValueFrom(
            this.mutationsRepository.add({
              entityType: "category",
              operation: "upsert",
              timestamp: now,
              previousEntity: existing,
              nextEntityData: updatedCategory,
            }),
          );

          await lootrackDb.categories.put(category);

          const assignableTransactions = await this.getAssignableTransactions(
            input.transactionIds,
            input.type,
          );

          if (assignableTransactions.length > 0) {
            const updatedTransactions = await this.addTransactionsMutations(
              category,
              assignableTransactions,
              now,
            );
            await lootrackDb.transactions.bulkPut(updatedTransactions);
            return {
              category,
              transactions: updatedTransactions,
            };
          }

          return { category };
        },
      ),
    );
  }

  private async addTransactionsMutations(
    category: Category,
    transactions: readonly Transaction[],
    timestamp: string,
  ): Promise<Transaction[]> {
    const transactionMutations: CreateMutationPayload<Transaction>[] =
      transactions.map((transaction) => ({
        previousEntity: transaction,

        nextEntityData: {
          id: transaction.id,
          type: transaction.type,
          amountInCents: transaction.amountInCents,
          description: transaction.description,
          occurredOn: transaction.occurredOn,
          categoryId: category.id,
          createdAt: transaction.createdAt,
          updatedAt: timestamp,
          deletedAt: transaction.deletedAt,
        },

        entityType: "transaction",
        timestamp,
        operation: "upsert",
      }));

    const results = await firstValueFrom(
      this.mutationsRepository.bulkAdd(transactionMutations),
    );

    return results.map(({ entity }) => entity);
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

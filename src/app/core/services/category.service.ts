import { map, Observable, of, switchMap } from "rxjs";
import {
  AddCategory,
  Category,
  CategoryMutationResult,
  SyncMetadata,
  Transaction,
} from "../data/models";
import { inject, Service } from "@angular/core";
import {
  PERSISTENCE_PROVIDER,
  PersistenceContext,
} from "../persistence/providers/provider.models";
import { createMutation } from "../sync/mutation";
import {
  CategoryAlreadyExistsError,
  CategoryTransactionAssignmentError,
} from "../data/errors";

export function cleanCategoryName(name: string): string {
  return name.trim();
}

export function categoryNamesMatch(a: string, b: string): boolean {
  return (
    cleanCategoryName(a).toLowerCase() === cleanCategoryName(b).toLowerCase()
  );
}

@Service()
export class CategoryService {
  private readonly persistenceProvider = inject(PERSISTENCE_PROVIDER);

  getAllActive(): Observable<readonly Category[]> {
    return this.persistenceProvider.categories
      .getAll()
      .pipe(
        map((categories) =>
          categories.filter((category) => category.deletedAt === null),
        ),
      );
  }

  getById(id: string): Observable<Category> {
    return this.getByIdFrom(this.persistenceProvider, id);
  }

  private getByIdFrom(
    db: PersistenceContext,
    id: string,
  ): Observable<Category> {
    return db.categories.get(id).pipe(
      map((category) => {
        if (!category || category.deletedAt !== null) {
          throw new Error("Category not found");
        }

        return category;
      }),
    );
  }

  add(input: AddCategory): Observable<CategoryMutationResult> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["categories", "transactions", "mutations"],
      (db) =>
        this.validateUniqueCategory(db, input.name, input.type).pipe(
          switchMap(() =>
            this.getAssignableTransactions(
              db,
              input.transactionIds,
              input.type,
            ),
          ),
          switchMap((assignableTransactions) => {
            const now = new Date().toISOString();

            const categoryData: Omit<Category, keyof SyncMetadata> = {
              id: crypto.randomUUID(),
              name: cleanCategoryName(input.name),
              type: input.type,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            };

            const { entity: category, mutation: categoryMutation } =
              createMutation<Category>({
                entityType: "category",
                operation: "upsert",
                timestamp: now,
                previousEntity: null,
                nextEntityData: categoryData,
              });

            const transactionResults = assignableTransactions.map(
              (transaction) =>
                createMutation<Transaction>({
                  previousEntity: transaction,
                  nextEntityData: {
                    id: transaction.id,
                    type: transaction.type,
                    amountInCents: transaction.amountInCents,
                    description: transaction.description,
                    occurredOn: transaction.occurredOn,
                    categoryId: category.id,
                    createdAt: transaction.createdAt,
                    updatedAt: now,
                    deletedAt: transaction.deletedAt,
                  },
                  entityType: "transaction",
                  operation: "upsert",
                  timestamp: now,
                }),
            );

            const updatedTransactions = transactionResults.map(
              ({ entity }) => entity,
            );

            const mutations = [
              categoryMutation,
              ...transactionResults.map(({ mutation }) => mutation),
            ];

            return db.mutations.addMany(mutations).pipe(
              switchMap(() => db.categories.add(category)),
              switchMap(() => db.transactions.putMany(updatedTransactions)),
              map(() => ({
                category,
                ...(updatedTransactions.length > 0
                  ? { transactions: updatedTransactions }
                  : {}),
              })),
            );
          }),
        ),
    );
  }

  private validateUniqueCategory(
    db: PersistenceContext,
    name: string,
    type: Category["type"],
    excludeId?: string,
  ): Observable<void> {
    return db.categories.getAll().pipe(
      map((categories) => {
        const duplicate = categories.find(
          (category) =>
            category.id !== excludeId &&
            category.type === type &&
            category.deletedAt === null &&
            categoryNamesMatch(category.name, name),
        );

        if (duplicate) {
          throw new CategoryAlreadyExistsError(
            `An ${type} category named "${cleanCategoryName(name)}" already exists`,
          );
        }
      }),
    );
  }
  private getAssignableTransactions(
    db: PersistenceContext,
    transactionIds: readonly string[] | undefined,
    targetType: Category["type"],
  ): Observable<readonly Transaction[]> {
    const ids = [...new Set(transactionIds ?? [])];

    if (ids.length === 0) {
      return of([]);
    }

    return db.transactions.getMany(ids).pipe(
      map((results) => {
        if (results.some((transaction) => transaction === undefined)) {
          throw new CategoryTransactionAssignmentError(
            "Some selected transactions were not found",
          );
        }

        const transactions = results.filter(
          (transaction): transaction is Transaction =>
            transaction !== undefined,
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
      }),
    );
  }
}

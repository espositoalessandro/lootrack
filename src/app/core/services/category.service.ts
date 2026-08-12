import { map, Observable, of, switchMap } from "rxjs";
import {
  AddCategory,
  Category,
  CategoryMutationResult,
  SyncMetadata,
  SyncMutation,
  Transaction,
  UpdateCategory,
} from "../data/models";
import { inject, Service } from "@angular/core";
import {
  PERSISTENCE_PROVIDER,
  PersistenceContext,
} from "../persistence/providers/provider.models";
import { createMutation } from "../sync/mutation";
import {
  CategoryAlreadyExistsError,
  CategoryInUseError,
  CategoryTransactionAssignmentError,
  CategoryTypeChangeBlockedError,
} from "../data/errors";

interface CategoryChange {
  category: Category;
  updatedTransactions: Transaction[];
  mutations: SyncMutation[];
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

  add(input: AddCategory): Observable<CategoryMutationResult> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["categories", "transactions", "mutations"],
      (db) =>
        this.validateUniqueCategory(db, input.name, input.type).pipe(
          switchMap(() => this.buildCategoryChange(db, null, input)),
          switchMap(({ category, updatedTransactions, mutations }) => {
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

  remove(id: string): Observable<void> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["categories", "transactions", "mutations"],
      (db) =>
        this.getByIdFrom(db, id).pipe(
          switchMap((category) =>
            this.getActiveTransactionsByCategory(db, id).pipe(
              switchMap((transactions) => {
                if (transactions.length > 0) {
                  throw new CategoryInUseError(transactions.length);
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

                const { entity, mutation } = createMutation<Category>({
                  entityType: "category",
                  operation: "delete",
                  timestamp: now,
                  previousEntity: category,
                  nextEntityData: deletedCategory,
                });

                return db.mutations.add(mutation).pipe(
                  switchMap(() => db.categories.put(entity)),
                  map(() => undefined),
                );
              }),
            ),
          ),
        ),
    );
  }

  update(
    id: string,
    input: UpdateCategory,
  ): Observable<CategoryMutationResult> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["categories", "transactions", "mutations"],
      (db) =>
        this.getByIdFrom(db, id).pipe(
          switchMap((existing) =>
            this.validateTypeChange(db, existing, input.type).pipe(
              switchMap(() =>
                this.validateUniqueCategory(
                  db,
                  input.name,
                  input.type,
                  existing.id,
                ),
              ),
              switchMap(() => this.buildCategoryChange(db, existing, input)),
              switchMap(({ category, updatedTransactions, mutations }) => {
                return db.mutations.addMany(mutations).pipe(
                  switchMap(() => db.categories.put(category)),
                  switchMap(() => db.transactions.putMany(updatedTransactions)),
                  map(() => ({
                    category,
                    ...(updatedTransactions.length > 0
                      ? {
                          transactions: updatedTransactions,
                        }
                      : {}),
                  })),
                );
              }),
            ),
          ),
        ),
    );
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

  private buildCategoryChange(
    db: PersistenceContext,
    existing: Category | null,
    input: AddCategory | UpdateCategory,
  ): Observable<CategoryChange> {
    return this.getAssignableTransactions(
      db,
      input.transactionIds,
      input.type,
    ).pipe(
      map((assignableTransactions) => {
        const now = new Date().toISOString();

        const categoryData: Omit<Category, keyof SyncMetadata> = {
          id: existing?.id ?? crypto.randomUUID(),
          name: this.cleanCategoryName(input.name),
          type: input.type,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          deletedAt: null,
        };

        const { entity: category, mutation: categoryMutation } =
          createMutation<Category>({
            entityType: "category",
            operation: "upsert",
            timestamp: now,
            previousEntity: existing,
            nextEntityData: categoryData,
          });

        const transactionResults = assignableTransactions.map((transaction) =>
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

        return { category, updatedTransactions, mutations };
      }),
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
            this.categoryNamesMatch(category.name, name),
        );

        if (duplicate) {
          throw new CategoryAlreadyExistsError(
            `An ${type} category named "${this.cleanCategoryName(name)}" already exists`,
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

  private cleanCategoryName(name: string): string {
    return name.trim();
  }

  private categoryNamesMatch(a: string, b: string): boolean {
    return (
      this.cleanCategoryName(a).toLowerCase() ===
      this.cleanCategoryName(b).toLowerCase()
    );
  }

  private getActiveTransactionsByCategory(
    db: PersistenceContext,
    categoryId: string,
  ): Observable<readonly Transaction[]> {
    return db.transactions
      .getAll()
      .pipe(
        map((transactions) =>
          transactions.filter(
            (transaction) =>
              transaction.categoryId === categoryId &&
              transaction.deletedAt === null,
          ),
        ),
      );
  }

  private validateTypeChange(
    db: PersistenceContext,
    category: Category,
    newType: Category["type"],
  ): Observable<void> {
    if (category.type === newType) {
      return of(undefined);
    }
    // forbid edit category type if there are associated transactions
    return this.getActiveTransactionsByCategory(db, category.id).pipe(
      map((transactions) => {
        if (transactions.length > 0) {
          throw new CategoryTypeChangeBlockedError(transactions.length);
        }
      }),
    );
  }
}

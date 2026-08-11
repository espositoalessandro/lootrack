import { inject, Service } from "@angular/core";
import {
  PERSISTENCE_PROVIDER,
  PersistenceContext,
} from "../providers/provider.models";
import { map, Observable, of, switchMap } from "rxjs";
import {
  AddTransaction,
  CategoryAssignment,
  SyncMetadata,
  Transaction,
  TransactionType,
  UpdateTransaction,
} from "../../data/models";
import { createMutation } from "../../sync/mutation";
import {
  InvalidCategoryReferenceError,
  InvalidTransactionError,
} from "../../data/errors";

@Service()
export class TransactionService {
  private readonly persistenceProvider = inject(PERSISTENCE_PROVIDER);

  getAllActive(): Observable<readonly Transaction[]> {
    return this.persistenceProvider.transactions
      .getAll()
      .pipe(
        map((transactions) =>
          transactions.filter((transaction) => transaction.deletedAt === null),
        ),
      );
  }

  getById(id: string): Observable<Transaction> {
    return this.getByIdFrom(this.persistenceProvider, id);
  }

  add(input: AddTransaction): Observable<Transaction> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["categories", "transactions", "mutations"],
      (db) => {
        const categoryId = this.resolveCategoryId(input.category);

        return this.validateCategoryReference(db, categoryId, input.type).pipe(
          switchMap(() => {
            const now = new Date().toISOString();

            const transactionData: Omit<Transaction, keyof SyncMetadata> = {
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

            const { entity, mutation } = createMutation<Transaction>({
              nextEntityData: transactionData,
              previousEntity: null,
              entityType: "transaction",
              operation: "upsert",
              timestamp: now,
            });

            return db.mutations.add(mutation).pipe(
              switchMap(() => db.transactions.add(entity)),
              map(() => entity),
            );
          }),
        );
      },
    );
  }

  update(id: string, changes: UpdateTransaction): Observable<Transaction> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["categories", "transactions", "mutations"],
      (db): Observable<Transaction> => {
        const categoryId = this.resolveCategoryId(changes.category);

        return this.getByIdFrom(db, id).pipe(
          switchMap((existing) =>
            this.validateCategoryReference(db, categoryId, changes.type).pipe(
              switchMap(() => {
                const now = new Date().toISOString();
                const updatedTransaction: Omit<
                  Transaction,
                  keyof SyncMetadata
                > = {
                  id,
                  type: changes.type,
                  amountInCents: changes.amountInCents,
                  description: changes.description,
                  occurredOn: changes.occurredOn,
                  categoryId,
                  createdAt: existing.createdAt,
                  updatedAt: now,
                  deletedAt: existing.deletedAt,
                };

                const { entity, mutation } = createMutation<Transaction>({
                  nextEntityData: updatedTransaction,
                  previousEntity: existing,
                  entityType: "transaction",
                  operation: "upsert",
                  timestamp: now,
                });

                return db.mutations.add(mutation).pipe(
                  switchMap(() => db.transactions.put(entity)),
                  map(() => entity),
                );
              }),
            ),
          ),
        );
      },
    );
  }

  remove(id: string): Observable<void> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["transactions", "mutations"],
      (db): Observable<void> => {
        return this.getByIdFrom(db, id).pipe(
          switchMap((existing) => {
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
            const { entity, mutation } = createMutation<Transaction>({
              nextEntityData: deletedTransaction,
              previousEntity: existing,
              entityType: "transaction",
              operation: "delete",
              timestamp: now,
            });
            return db.mutations.add(mutation).pipe(
              switchMap(() => db.transactions.put(entity)),
              map(() => undefined),
            );
          }),
        );
      },
    );
  }

  private getByIdFrom(
    db: PersistenceContext,
    id: string,
  ): Observable<Transaction> {
    return db.transactions.get(id).pipe(
      map((transaction) => {
        if (!transaction || transaction.deletedAt !== null) {
          throw new Error("Transaction not found");
        }

        return transaction;
      }),
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

  private validateCategoryReference(
    db: PersistenceContext,
    categoryId: string | null,
    transactionType: TransactionType,
  ): Observable<void> {
    if (categoryId === null) {
      return of(undefined);
    }

    return db.categories.get(categoryId).pipe(
      map((category) => {
        if (!category) {
          throw new InvalidCategoryReferenceError(categoryId, "not-found");
        }

        if (category.deletedAt !== null) {
          throw new InvalidCategoryReferenceError(categoryId, "deleted");
        }

        if (category.type !== transactionType) {
          throw new InvalidCategoryReferenceError(categoryId, "type-mismatch");
        }
      }),
    );
  }
}

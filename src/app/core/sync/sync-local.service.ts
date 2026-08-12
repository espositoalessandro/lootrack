import { inject, Service } from "@angular/core";
import { forkJoin, map, Observable, switchMap } from "rxjs";

import {
  Category,
  LocalSyncChanges,
  LocalSyncSnapshot,
  RemoteEntity,
  RemoteSyncRecord,
  SyncMutation,
  Transaction,
} from "../models/models";
import { PERSISTENCE_PROVIDER } from "../persistence/providers/provider.models";

@Service()
export class SyncLocalService {
  private readonly persistenceProvider = inject(PERSISTENCE_PROVIDER);

  getSnapshot(): Observable<LocalSyncSnapshot> {
    return this.persistenceProvider.doTransaction(
      "read",
      ["transactions", "categories", "mutations"],
      (db) =>
        forkJoin({
          transactions: db.transactions.getAll(),
          categories: db.categories.getAll(),
          mutations: db.mutations.getPending(),
        }),
    );
  }

  applyChanges(changes: LocalSyncChanges): Observable<void> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["transactions", "categories", "mutations"],
      (db) =>
        db.mutations.removeByIds(changes.mutationIdsToAcknowledge).pipe(
          switchMap(() => db.mutations.getPending()),

          map((remainingMutations) =>
            this.buildApplyPlan(changes.remoteRecords, remainingMutations),
          ),

          switchMap(({ transactions, categories }) =>
            db.transactions.putMany(transactions).pipe(
              switchMap(() => db.categories.putMany(categories)),
              map(() => undefined),
            ),
          ),
        ),
    );
  }

  private buildApplyPlan(
    remoteRecords: readonly RemoteSyncRecord[],
    remainingMutations: readonly SyncMutation[],
  ): {
    transactions: Transaction[];
    categories: Category[];
  } {
    const pendingEntities = new Set(
      remainingMutations.map((mutation) =>
        this.entityKey(mutation.entityType, mutation.entityId),
      ),
    );

    const foundRemoteRecords = new Set<string>();

    const transactions: Transaction[] = [];
    const categories: Category[] = [];

    for (const record of remoteRecords) {
      const key = this.entityKey(record.entityType, record.entityId);

      if (foundRemoteRecords.has(key)) {
        throw new Error(`Duplicate remote synchronization record: ${key}`);
      }

      foundRemoteRecords.add(key);

      // A newer local mutation exists for this entity.
      // Don't overwrite it with the remote response.
      if (pendingEntities.has(key)) {
        continue;
      }

      const entity = this.parseRemoteEntity(record);

      switch (record.entityType) {
        case "transaction":
          transactions.push(entity as Transaction);
          break;

        case "category":
          categories.push(entity as Category);
          break;
      }
    }

    return {
      transactions,
      categories,
    };
  }

  private parseRemoteEntity(record: RemoteSyncRecord): RemoteEntity {
    const value: unknown = JSON.parse(record.payloadJson);

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`Remote ${record.entityType} payload must be an object`);
    }

    const entity = value as Record<string, unknown>;

    if (entity["id"] !== record.entityId) {
      throw new Error(`Remote ${record.entityType} payload has an invalid ID`);
    }

    if (entity["revision"] !== record.revision) {
      throw new Error(
        `Remote ${record.entityType} payload has inconsistent revision metadata`,
      );
    }

    if (entity["lastMutationId"] !== record.mutationId) {
      throw new Error(
        `Remote ${record.entityType} payload has inconsistent mutation metadata`,
      );
    }

    const deletedAt = entity["deletedAt"];

    if (record.operation === "upsert" && deletedAt !== null) {
      throw new Error(
        `Remote upsert ${record.entityType} is marked as deleted`,
      );
    }

    if (record.operation === "delete" && typeof deletedAt !== "string") {
      throw new Error(
        `Remote deleted ${record.entityType} has no deletion timestamp`,
      );
    }

    return value as RemoteEntity;
  }

  private entityKey(
    entityType: "transaction" | "category",
    entityId: string,
  ): string {
    return `${entityType}:${entityId}`;
  }
}

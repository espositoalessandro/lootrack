import { inject, Service } from "@angular/core";
import { map, Observable, switchMap } from "rxjs";

import { Entity, SyncConflictCandidate, SyncMetadata } from "../models/models";
import {
  PERSISTENCE_PROVIDER,
  PersistenceContext,
  PersistenceStore,
} from "../persistence/providers/provider.models";
import { createMutation } from "../sync/mutation";

export type ConflictResolution = "keep-local" | "keep-remote";

@Service()
export class ConflictResolutionService {
  private readonly persistenceProvider = inject(PERSISTENCE_PROVIDER);

  resolve(
    conflict: SyncConflictCandidate,
    resolution: ConflictResolution,
  ): Observable<void> {
    return this.persistenceProvider.doTransaction(
      "readwrite",
      ["transactions", "categories", "mutations"],
      (db) =>
        db.mutations.getPending().pipe(
          map((mutations) =>
            mutations
              .filter(
                (mutation) =>
                  mutation.entityType === conflict.entityType &&
                  mutation.entityId === conflict.entityId,
              )
              .map((mutation) => mutation.mutationId),
          ),

          switchMap((mutationIds) => db.mutations.removeByIds(mutationIds)),

          switchMap(() =>
            resolution === "keep-remote"
              ? this.keepRemote(db, conflict)
              : this.keepLocal(db, conflict),
          ),
        ),
    );
  }

  private keepRemote(
    db: PersistenceContext,
    conflict: SyncConflictCandidate,
  ): Observable<void> {
    const store = this.entityStore(db, conflict);

    if (conflict.remotePayloadJson === null) {
      return store.delete(conflict.entityId);
    }

    const remote = JSON.parse(conflict.remotePayloadJson) as Entity;

    return store.put(remote).pipe(map(() => undefined));
  }

  private keepLocal(
    db: PersistenceContext,
    conflict: SyncConflictCandidate,
  ): Observable<void> {
    switch (conflict.entityType) {
      case "transaction":
        return this.rebaseLocal(db, db.transactions, conflict, "transaction");

      case "category":
        return this.rebaseLocal(db, db.categories, conflict, "category");
    }
  }

  private rebaseLocal<T extends Entity>(
    db: PersistenceContext,
    store: PersistenceStore<T, string>,
    conflict: SyncConflictCandidate,
    entityType: "transaction" | "category",
  ): Observable<void> {
    return store.get(conflict.entityId).pipe(
      switchMap((currentLocal) => {
        if (!currentLocal) {
          throw new Error(`Local ${entityType} no longer exists`);
        }

        const remoteBase =
          conflict.remotePayloadJson === null
            ? null
            : (JSON.parse(conflict.remotePayloadJson) as T);
        const {
          revision: _revision,
          lastMutationId: _lastMutationId,
          ...nextEntityData
        } = currentLocal;
        const operation = currentLocal.deletedAt === null ? "upsert" : "delete";
        const timestamp = new Date().toISOString();
        const { entity, mutation } = createMutation<T>({
          nextEntityData: nextEntityData as Omit<T, keyof SyncMetadata>,
          previousEntity: remoteBase,
          entityType,
          operation,
          timestamp,
        });

        return db.mutations.add(mutation).pipe(
          switchMap(() => store.put(entity)),
          map(() => undefined),
        );
      }),
    );
  }

  private entityStore<T extends Entity>(
    db: PersistenceContext,
    conflict: SyncConflictCandidate,
  ): PersistenceStore<T, string> {
    switch (conflict.entityType) {
      case "transaction":
        return db.transactions as unknown as PersistenceStore<T, string>;
      case "category":
        return db.categories as unknown as PersistenceStore<T, string>;
      default:
        throw new Error(`Unknown entity type: ${conflict.entityType}`);
    }
  }
}

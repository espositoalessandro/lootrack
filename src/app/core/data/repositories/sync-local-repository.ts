import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";

import { lootrackDb } from "../database";
import {
  Category,
  RemoteSyncRecord,
  SyncMutation,
  Transaction,
} from "../models";

export interface LocalSyncSnapshot {
  readonly transactions: readonly Transaction[];
  readonly categories: readonly Category[];
  readonly mutations: readonly SyncMutation[];
}

export interface LocalSyncChanges {
  /**
   * Final remote records that may be applied locally.
   *
   * These can come from:
   * - the original remote pull;
   * - the result of a successful push.
   */
  readonly remoteRecords: readonly RemoteSyncRecord[];

  /**
   * Outbox mutations that are known to be represented remotely.
   */
  readonly mutationIdsToAcknowledge: readonly string[];
}

type RemoteEntity = Transaction | Category;

@Injectable({
  providedIn: "root",
})
export class SyncLocalRepository {
  getSnapshot(): Observable<LocalSyncSnapshot> {
    return defer(() =>
      lootrackDb.transaction(
        "r",
        lootrackDb.transactions,
        lootrackDb.categories,
        lootrackDb.mutations,
        async () => {
          const [transactions, categories, mutations] = await Promise.all([
            lootrackDb.transactions.toArray(),
            lootrackDb.categories.toArray(),
            lootrackDb.mutations.orderBy("localSequence").toArray(),
          ]);
          const strippedMutations = mutations.map(
            ({ localSequence: _, ...mutation }) => mutation,
          );
          return {
            transactions,
            categories,
            mutations: strippedMutations,
          };
        },
      ),
    );
  }

  applyChanges(changes: LocalSyncChanges): Observable<void> {
    return defer(() =>
      lootrackDb.transaction(
        "rw",
        lootrackDb.transactions,
        lootrackDb.categories,
        lootrackDb.mutations,
        async () => {
          await this.acknowledgeMutations(changes.mutationIdsToAcknowledge);
          /*
           * Read the remaining outbox after acknowledgements.
           *
           * A new local mutation may have been created while the network
           * request was running. In that case, its local entity must not be
           * overwritten by an older remote response.
           */
          const remainingMutations = await lootrackDb.mutations.toArray();
          const entitiesWithPendingChanges = new Set(
            remainingMutations.map((mutation) =>
              this.entityKey(mutation.entityType, mutation.entityId),
            ),
          );
          const foundRemoteRecords = new Set<string>();

          for (const record of changes.remoteRecords) {
            const key = this.entityKey(record.entityType, record.entityId);

            if (foundRemoteRecords.has(key)) {
              throw new Error(
                `Duplicate remote synchronization record: ${key}`,
              );
            }

            foundRemoteRecords.add(key);
            /*
             * Preserve newer local work.
             *
             * Example:
             * - mutations A and B were pushed;
             * - the user created mutation C while the request was running;
             * - the server returns the final state produced by B.
             *
             * A and B are acknowledged, but the local entity containing C
             * must remain untouched.
             */
            if (entitiesWithPendingChanges.has(key)) {
              continue;
            }

            const entity = this.parseRemoteEntity(record);

            switch (record.entityType) {
              case "transaction":
                await lootrackDb.transactions.put(entity as Transaction);
                break;

              case "category":
                await lootrackDb.categories.put(entity as Category);
                break;

              default: {
                return record.entityType;
              }
            }
          }
        },
      ),
    );
  }

  private async acknowledgeMutations(
    mutationIds: readonly string[],
  ): Promise<void> {
    const uniqueMutationIds = [...new Set(mutationIds)];

    if (uniqueMutationIds.length === 0) {
      return;
    }

    await lootrackDb.mutations
      .where("mutationId")
      .anyOf(uniqueMutationIds)
      .delete();
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

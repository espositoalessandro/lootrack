import { defer, Observable } from "rxjs";

import { lootrackDb } from "./database";
import { SyncMutation } from "../../../models/models";
import { MutationPersistenceStore } from "../provider.models";

export class DexieMutationRepository implements MutationPersistenceStore {
  getPending(): Observable<readonly SyncMutation[]> {
    return defer(async () => {
      const stored = await lootrackDb.mutations
        .orderBy("localSequence")
        .toArray();

      return stored.map(({ localSequence: _, ...mutation }) => mutation);
    });
  }

  add(mutation: SyncMutation): Observable<void> {
    return defer(async () => {
      await lootrackDb.mutations.add(mutation);
    });
  }

  addMany(mutations: readonly SyncMutation[]): Observable<void> {
    return defer(async () => {
      if (mutations.length === 0) {
        return;
      }

      await lootrackDb.mutations.bulkAdd([...mutations]);
    });
  }

  removeByIds(mutationIds: readonly string[]): Observable<void> {
    return defer(async () => {
      const uniqueIds = [...new Set(mutationIds)];

      if (uniqueIds.length === 0) {
        return;
      }

      await lootrackDb.mutations.where("mutationId").anyOf(uniqueIds).delete();
    });
  }
}

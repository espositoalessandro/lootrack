import { Injectable } from "@angular/core";
import { Entity, SyncMutation } from "../models";
import { defer, Observable } from "rxjs";
import { lootrackDb } from "../database";
import {
  createMutation,
  CreateMutationPayload,
  MutationResult,
} from "../../sync/mutation";

@Injectable({
  providedIn: "root",
})
export class MutationsRepository {
  getPending(): Observable<SyncMutation[]> {
    return defer(async () => {
      const storedMutations = await lootrackDb.mutations
        .orderBy("localSequence")
        .toArray();

      return storedMutations.map(
        ({ localSequence: _, ...mutation }) => mutation,
      );
    });
  }

  add<T extends Entity>(
    payload: CreateMutationPayload<T>,
  ): Observable<MutationResult<T>> {
    return defer(async () => {
      const result = createMutation(payload);
      await lootrackDb.mutations.add(result.mutation);
      return result;
    });
  }

  bulkAdd<T extends Entity>(
    payload: CreateMutationPayload<T>[],
  ): Observable<MutationResult<T>[]> {
    return defer(async () => {
      const results = payload.map((payload) => createMutation(payload));
      const mutations = results.map(({ mutation }) => mutation);
      await lootrackDb.mutations.bulkAdd(mutations);

      return results;
    });
  }
}

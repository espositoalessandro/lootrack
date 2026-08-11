import { Injectable } from "@angular/core";
import {
  Entity,
  SyncEntityType,
  SyncMetadata,
  SyncMutation,
  SyncOperation,
} from "../models";
import { defer, Observable } from "rxjs";
import { lootrackDb } from "../database";

export interface MutationResult<T extends Entity> {
  entity: T;
  mutation: SyncMutation;
}

export interface CreateMutationPayload<T extends Entity> {
  nextEntityData: Omit<T, keyof SyncMetadata>;
  previousEntity: T | null;
  entityType: SyncEntityType;
  operation: SyncOperation;
  timestamp: string;
}

function createMutation<T extends Entity>(
  payload: CreateMutationPayload<T>,
): MutationResult<T> {
  const mutationId = crypto.randomUUID();

  const entity = {
    ...payload.nextEntityData,
    revision: (payload.previousEntity?.revision ?? 0) + 1,
    lastMutationId: mutationId,
  } as T;

  return {
    entity,
    mutation: {
      mutationId,
      entityType: payload.entityType,
      entityId: entity.id,
      operation: payload.operation,
      expectedRevision: payload.previousEntity?.revision ?? null,
      expectedMutationId: payload.previousEntity?.lastMutationId ?? null,
      basePayloadJson:
        payload.previousEntity === null
          ? null
          : JSON.stringify(payload.previousEntity),

      payloadJson: JSON.stringify(entity),
      createdAt: payload.timestamp,
    },
  };
}

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

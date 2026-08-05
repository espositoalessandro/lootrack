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

export type UnstoredSyncMutation = Omit<SyncMutation, "localSequence">;

export interface MutationResult<T extends Entity> {
  entity: T;
  mutation: SyncMutation;
}
interface UnstoredMutationResult<T extends Entity> {
  entity: T;
  mutation: UnstoredSyncMutation;
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
): UnstoredMutationResult<T> {
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
  add<T extends Entity>(
    payload: CreateMutationPayload<T>,
  ): Observable<MutationResult<T>> {
    return defer(async () => {
      const { entity, mutation } = createMutation(payload);
      const localSequence = await lootrackDb.mutations.add(mutation);

      return {
        entity,
        mutation: {
          ...mutation,
          localSequence,
        },
      };
    });
  }

  bulkAdd<T extends Entity>(
    payload: CreateMutationPayload<T>[],
  ): Observable<MutationResult<T>[]> {
    return defer(async () => {
      const results = payload.map((payload) => createMutation(payload));
      const mutations = results.map(({ mutation }) => mutation);
      const sequences = await lootrackDb.mutations.bulkAdd(mutations, {
        allKeys: true,
      });
      return results.map((result, index) => {
        const localSequence = sequences[index];

        if (localSequence === undefined) {
          throw new Error(
            `Missing local sequence for mutation ${result.mutation.mutationId}`,
          );
        }

        return {
          ...result,
          mutation: {
            ...result.mutation,
            localSequence,
          },
        };
      });
    });
  }
}

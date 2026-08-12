import {
  Entity,
  SyncEntityType,
  SyncMetadata,
  SyncMutation,
  SyncOperation,
} from "../models/models";

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

export function createMutation<T extends Entity>(
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

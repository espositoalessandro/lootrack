import { inject, Service } from "@angular/core";
import { map, Observable } from "rxjs";

import {
  PendingChange,
  PendingEntityChanges,
  RemoteEntity,
  SyncMutation,
} from "../models/models";
import { PERSISTENCE_PROVIDER } from "../persistence/providers/provider.models";
import { diffEntityPayloads } from "../sync/entity-diff";

@Service()
export class PendingChangesService {
  private readonly persistenceProvider = inject(PERSISTENCE_PROVIDER);

  getAll(): Observable<readonly PendingEntityChanges[]> {
    return this.persistenceProvider.mutations
      .getPending()
      .pipe(map((mutations) => this.groupByEntity(mutations)));
  }

  private groupByEntity(
    mutations: readonly SyncMutation[],
  ): readonly PendingEntityChanges[] {
    const groups = new Map<
      string,
      {
        entityType: SyncMutation["entityType"];
        entityId: string;
        entity: RemoteEntity;
        changes: PendingChange[];
      }
    >();

    for (const mutation of mutations) {
      const key = `${mutation.entityType}:${mutation.entityId}`;
      const diff = diffEntityPayloads(
        mutation.basePayloadJson,
        mutation.payloadJson,
        mutation.operation,
      );
      let group = groups.get(key);

      if (!group) {
        group = {
          entityType: mutation.entityType,
          entityId: mutation.entityId,
          entity: diff.after,
          changes: [],
        };
        groups.set(key, group);
      }

      group.changes.push({
        kind: diff.kind,
        createdAt: mutation.createdAt,
        fields: diff.fields,
      });
    }

    return [...groups.values()];
  }
}

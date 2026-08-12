import { inject, Service } from "@angular/core";
import { map, Observable } from "rxjs";

import {
  PendingChange,
  PendingEntityChanges,
  SyncMutation,
} from "../models/models";
import { PERSISTENCE_PROVIDER } from "../persistence/providers/provider.models";

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
        changes: PendingChange[];
      }
    >();

    for (const mutation of mutations) {
      const key = `${mutation.entityType}:${mutation.entityId}`;

      let group = groups.get(key);

      if (!group) {
        group = {
          entityType: mutation.entityType,
          entityId: mutation.entityId,
          changes: [],
        };

        groups.set(key, group);
      }

      group.changes.push({
        operation: mutation.operation,
        createdAt: mutation.createdAt,
        beforeJson: mutation.basePayloadJson,
        afterJson: mutation.payloadJson,
      });
    }

    return [...groups.values()];
  }
}

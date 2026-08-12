import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { SYNC_PROVIDER } from "../models/CONST";
import { SyncReconciler } from "./sync-reconciler";
import { SyncRunConflictError } from "../models/errors";
import { SyncLocalService } from "./sync-local.service";

@Injectable({
  providedIn: "root",
})
export class SyncEngine {
  private readonly localService = inject(SyncLocalService);
  private readonly provider = inject(SYNC_PROVIDER);
  private readonly reconciler = inject(SyncReconciler);

  async synchronize(): Promise<void> {
    const localSnapshot = await firstValueFrom(this.localService.getSnapshot());
    const remoteSnapshot = await this.provider.pull();
    const plan = this.reconciler.reconcile(localSnapshot, remoteSnapshot);

    if (plan.conflicts.length > 0) {
      throw new SyncRunConflictError(plan.conflicts);
    }

    const pushResult = await this.provider.push({
      mutations: plan.mutationsToPush,
    });
    const pushedMutationIds = plan.mutationsToPush.map(
      ({ mutationId }) => mutationId,
    );

    /*
     * This is the only local write performed by a successful run.
     *
     * applyChanges() also protects entities that received newer mutations
     * while the network operations were running.
     */
    await firstValueFrom(
      this.localService.applyChanges({
        remoteRecords: [...plan.remoteRecordsToApply, ...pushResult.records],
        mutationIdsToAcknowledge: [
          ...plan.mutationIdsToAcknowledge,
          ...pushedMutationIds,
        ],
      }),
    );
  }
}

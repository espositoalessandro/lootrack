import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { SYNC_PROVIDER } from "../data/CONST";
import { SyncLocalRepository } from "../data/repositories/sync-local-repository";
import { SyncReconciler } from "./sync-reconciler";
import { SyncRunConflictError } from "../data/errors";

@Injectable({
  providedIn: "root",
})
export class SyncEngine {
  private readonly provider = inject(SYNC_PROVIDER);

  private readonly localRepository = inject(SyncLocalRepository);

  private readonly reconciler = inject(SyncReconciler);

  async synchronize(): Promise<void> {
    /*
     * This snapshot defines the fixed boundary of the run.
     *
     * Mutations created after this point do not participate.
     */
    const localSnapshot = await firstValueFrom(
      this.localRepository.getSnapshot(),
    );

    const remoteSnapshot = await this.provider.pull();

    const plan = this.reconciler.reconcile(localSnapshot, remoteSnapshot);

    /*
     * Strict all-or-nothing rule:
     *
     * No push.
     * No pulled records applied locally.
     * No mutations acknowledged.
     */
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
      this.localRepository.applyChanges({
        remoteRecords: [...plan.remoteRecordsToApply, ...pushResult.records],

        mutationIdsToAcknowledge: [
          ...plan.mutationIdsToAcknowledge,
          ...pushedMutationIds,
        ],
      }),
    );
  }
}

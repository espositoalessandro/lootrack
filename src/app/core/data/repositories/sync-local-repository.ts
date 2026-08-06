import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";

import { lootrackDb } from "../database";
import { Category, SyncMutation, Transaction } from "../models";

export interface LocalSyncSnapshot {
  readonly transactions: readonly Transaction[];
  readonly categories: readonly Category[];
  readonly mutations: readonly SyncMutation[];
}

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

          return {
            transactions,
            categories,
            mutations,
          };
        },
      ),
    );
  }
}

import { Injectable } from "@angular/core";
import { defer, firstValueFrom, Observable } from "rxjs";

import { DexieEntityRepository } from "./dexie-entity.repository";
import { DexieMutationRepository } from "./dexie-mutation.repository";
import { lootrackDb } from "../../../data/database";
import {
  PersistenceContext,
  PersistenceProvider,
  PersistenceStoreName,
  PersistenceTransactionMode,
} from "../provider.models";

@Injectable()
export class DexiePersistenceProvider implements PersistenceProvider {
  readonly transactions = new DexieEntityRepository(lootrackDb.transactions);
  readonly categories = new DexieEntityRepository(lootrackDb.categories);
  readonly appSettings = new DexieEntityRepository(lootrackDb.appSettings);
  readonly syncTargets = new DexieEntityRepository(lootrackDb.syncTargets);

  readonly mutations = new DexieMutationRepository();

  doTransaction<T>(
    mode: PersistenceTransactionMode,
    stores: readonly PersistenceStoreName[],
    operation: (context: PersistenceContext) => Observable<T>,
  ): Observable<T> {
    return defer(() =>
      lootrackDb.transaction(
        mode === "read" ? "r" : "rw",
        stores.map((store) => this.resolveTable(store)),
        () => firstValueFrom(operation(this)),
      ),
    );
  }

  private resolveTable(store: PersistenceStoreName) {
    switch (store) {
      case "transactions":
        return lootrackDb.transactions;

      case "categories":
        return lootrackDb.categories;

      case "appSettings":
        return lootrackDb.appSettings;

      case "syncTargets":
        return lootrackDb.syncTargets;

      case "mutations":
        return lootrackDb.mutations;
    }
  }
}

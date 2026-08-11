import { InjectionToken } from "@angular/core";
import { Observable } from "rxjs";

import {
  AppSettings,
  Category,
  SyncMutation,
  SyncTarget,
  Transaction,
} from "../../data/models";

export const PERSISTENCE_PROVIDER = new InjectionToken<PersistenceProvider>(
  "PERSISTENCE_PROVIDER",
);

export interface MutationPersistenceStore {
  getPending(): Observable<readonly SyncMutation[]>;
  add(mutation: SyncMutation): Observable<void>;
  addMany(mutations: readonly SyncMutation[]): Observable<void>;
  removeByIds(mutationIds: readonly string[]): Observable<void>;
}

export interface PersistenceStore<T, K> {
  get(key: K): Observable<T | undefined>;
  getMany(keys: readonly K[]): Observable<readonly (T | undefined)[]>;
  getAll(): Observable<readonly T[]>;
  add(entity: T): Observable<K>;
  put(entity: T): Observable<K>;
  putMany(entities: readonly T[]): Observable<void>;
  delete(key: K): Observable<void>;
}

export interface PersistenceContext {
  transactions: PersistenceStore<Transaction, Transaction["id"]>;
  categories: PersistenceStore<Category, Category["id"]>;
  appSettings: PersistenceStore<AppSettings, AppSettings["id"]>;
  syncTargets: PersistenceStore<SyncTarget, SyncTarget["id"]>;
  mutations: MutationPersistenceStore;
}

export type PersistenceStoreName = keyof PersistenceContext;
export type PersistenceTransactionMode = "read" | "readwrite";

export interface PersistenceProvider extends PersistenceContext {
  doTransaction<T>(
    mode: PersistenceTransactionMode,
    stores: readonly PersistenceStoreName[],
    operation: (context: PersistenceContext) => Observable<T>,
  ): Observable<T>;
}

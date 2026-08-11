import { InjectionToken } from "@angular/core";
import { Observable } from "rxjs";

import {
  AppSettings,
  Category,
  SyncMutation,
  SyncTarget,
  Transaction,
} from "../data/models";

export const PERSISTENCE_PROVIDER = new InjectionToken<PersistenceProvider>(
  "PERSISTENCE_PROVIDER",
);

export interface PersistenceStore<T, K> {
  get(key: K): Observable<T | undefined>;
  getAll(): Observable<readonly T[]>;
  add(entity: T): Observable<K>;
  put(entity: T): Observable<K>;
  delete(key: K): Observable<void>;
}

export interface PersistenceContext {
  transactions: PersistenceStore<Transaction, string>;
  categories: PersistenceStore<Category, string>;
  mutations: PersistenceStore<SyncMutation, number>;
  appSettings: PersistenceStore<AppSettings, string>;
  syncTargets: PersistenceStore<SyncTarget, string>;
}

export type PersistenceStoreName = keyof PersistenceContext;

export interface PersistenceProvider extends PersistenceContext {
  transaction<T>(
    stores: readonly PersistenceStoreName[],
    operation: (context: PersistenceContext) => Observable<T>,
  ): Observable<T>;
}

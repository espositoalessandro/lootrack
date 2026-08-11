import { IndexableType, Table } from "dexie";
import { defer, Observable } from "rxjs";

import { PersistenceStore } from "../provider.models";

export class DexieEntityRepository<
  T,
  K extends IndexableType,
> implements PersistenceStore<T, K> {
  constructor(private readonly table: Table<T, K, T>) {}

  get(key: K): Observable<T | undefined> {
    return defer(() => this.table.get(key));
  }

  getAll(): Observable<readonly T[]> {
    return defer(() => this.table.toArray());
  }

  add(entity: T): Observable<K> {
    return defer(() => this.table.add(entity));
  }

  put(entity: T): Observable<K> {
    return defer(() => this.table.put(entity));
  }

  delete(key: K): Observable<void> {
    return defer(() => this.table.delete(key));
  }
}

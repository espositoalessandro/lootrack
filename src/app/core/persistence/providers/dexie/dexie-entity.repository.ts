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

  getMany(keys: readonly K[]): Observable<readonly (T | undefined)[]> {
    return defer(() => this.table.bulkGet([...keys]));
  }

  putMany(entities: readonly T[]): Observable<void> {
    return defer(async () => {
      if (entities.length === 0) {
        return;
      }

      await this.table.bulkPut([...entities]);
    });
  }

  delete(key: K): Observable<void> {
    return defer(() => this.table.delete(key));
  }
}

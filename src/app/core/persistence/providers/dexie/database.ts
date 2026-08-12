import Dexie, { type EntityTable, type Table } from "dexie";

import {
  AppSettings,
  Category,
  SyncMutation,
  SyncTarget,
  Transaction,
} from "../../../models/models";

interface StoredSyncMutation extends SyncMutation {
  localSequence?: number;
}

export class Database extends Dexie {
  transactions!: Table<Transaction, Transaction["id"]>;
  categories!: Table<Category, Category["id"]>;
  appSettings!: Table<AppSettings, AppSettings["id"]>;
  syncTargets!: Table<SyncTarget, SyncTarget["id"]>;

  mutations!: EntityTable<StoredSyncMutation, "localSequence">;

  constructor() {
    super("lootrack");

    this.version(1).stores({
      transactions:
        "id, type, occurredOn, categoryId, createdAt, updatedAt, deletedAt",
      categories: "id, name, createdAt, updatedAt, deletedAt",
      appSettings: "id",
      mutations:
        "++localSequence, &mutationId, entityType, entityId, createdAt",
      syncTargets: "id",
    });
  }
}

export const lootrackDb = new Database();

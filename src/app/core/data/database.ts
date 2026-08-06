import Dexie, { type EntityTable } from "dexie";
import {
  AppSettings,
  Category,
  SyncMutation,
  SyncTarget,
  Transaction,
} from "./models";

export class Database extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  appSettings!: EntityTable<AppSettings, "id">;
  mutations!: EntityTable<SyncMutation, "localSequence">;
  syncTargets!: EntityTable<SyncTarget, "id">;

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

import Dexie, { type EntityTable } from "dexie";
import { AppSettings, Category, Transaction } from "./models";

export class Database extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  appSettings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("lootrack");

    this.version(1).stores({
      transactions:
        "id, type, occurredOn, categoryId, createdAt, updatedAt, deletedAt",
      categories: "id, name, createdAt, updatedAt, deletedAt",
      appSettings: "id",
    });
  }
}

export const lootrackDb = new Database();

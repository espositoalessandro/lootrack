import Dexie, { type EntityTable } from "dexie";
import { Category, Transaction } from "./models";

export class Database extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;

  constructor() {
    super("lootrack");

    this.version(2).stores({
      transactions:
        "id, type, occurredOn, categoryId, createdAt, updatedAt, deletedAt",
      categories: "id, name, createdAt, updatedAt, deletedAt",
    });
  }
}

export const lootrackDb = new Database();

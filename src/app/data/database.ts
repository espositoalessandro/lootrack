import Dexie, { type EntityTable } from "dexie";
import { AppSettings, Category, Mutation, Transaction } from "./models";

export class Database extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  appSettings!: EntityTable<AppSettings, "id">;
  mutations!: EntityTable<Mutation, "mutationId">;

  constructor() {
    super("lootrack");

    this.version(1).stores({
      transactions:
        "id, type, occurredOn, categoryId, createdAt, updatedAt, deletedAt",
      categories: "id, name, createdAt, updatedAt, deletedAt",
      appSettings: "id",
      mutations: "mutationId, entityId, createdAt",
    });
  }
}

export const lootrackDb = new Database();

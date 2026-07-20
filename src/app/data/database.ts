import Dexie, { type EntityTable } from "dexie";
import { Transaction } from "./models";

export class Database extends Dexie {
  transactions!: EntityTable<Transaction, "id">;

  constructor() {
    super("lootrack");

    this.version(1).stores({
      transactions: "id, occurredOn, createdAt",
    });
  }
}

export const lootrackDb = new Database();

import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import { AddTransaction, Transaction } from "./models";
import { lootrackDb } from "./database";

@Injectable({
  providedIn: "root",
})
export class TransactionsDatabaseService {
  getAll(): Observable<Transaction[]> {
    return defer(() => lootrackDb.transactions.toArray());
  }

  add(input: AddTransaction): Observable<Transaction> {
    return defer(async () => {
      const transaction: Transaction = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      await lootrackDb.transactions.add(transaction);
      return transaction;
    });
  }

  remove(id: string) {
    return defer(async () => {
      await lootrackDb.transactions.delete(id);
      return id;
    });
  }
}

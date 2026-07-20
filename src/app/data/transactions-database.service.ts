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

  add(transaction: AddTransaction): Observable<string> {
    return defer(() =>
      lootrackDb.transactions.add({
        ...transaction,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }),
    );
  }
}

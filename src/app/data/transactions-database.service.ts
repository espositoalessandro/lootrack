import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import { Transaction } from "./models";
import { lootrackDb } from "./database";

@Injectable({
  providedIn: "root",
})
export class TransactionsDatabaseService {
  getAll(): Observable<Transaction[]> {
    return defer(() => lootrackDb.transactions.toArray());
  }

  add(transaction: Transaction): Observable<string> {
    return defer(() => lootrackDb.transactions.add(transaction));
  }
}

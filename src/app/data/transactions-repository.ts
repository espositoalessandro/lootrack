import { Injectable } from "@angular/core";
import { defer, Observable } from "rxjs";
import { AddTransaction, Transaction } from "./models";
import { lootrackDb } from "./database";

@Injectable({
  providedIn: "root",
})
export class TransactionsRepository {
  getActive(): Observable<Transaction[]> {
    return defer(() =>
      lootrackDb.transactions
        .filter((transaction) => transaction.deletedAt === null)
        .toArray(),
    );
  }

  getAllIncludingDeleted(): Observable<Transaction[]> {
    return defer(() => lootrackDb.transactions.toArray());
  }

  add(input: AddTransaction): Observable<Transaction> {
    return defer(async () => {
      const transaction: Transaction = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        categoryId: null,
        deletedAt: null,
      };
      await lootrackDb.transactions.add(transaction);
      return transaction;
    });
  }

  remove(id: string): Observable<string> {
    // return defer(async () => {
    //   await lootrackDb.transactions.delete(id);
    //   return id;
    // });

    return defer(async () => {
      const existing = await lootrackDb.transactions.get(id);

      if (!existing) {
        throw new Error("Transaction not found");
      }

      const deletedTransaction: Transaction = {
        ...existing,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await lootrackDb.transactions.put(deletedTransaction);

      return deletedTransaction.id;
    });
  }

  update(id: string, changes: AddTransaction): Observable<Transaction> {
    return defer(async () => {
      const existing = await lootrackDb.transactions.get(id);

      if (!existing) {
        throw new Error("Transaction not found");
      }

      const updatedTransaction: Transaction = {
        ...existing,
        ...changes,
        updatedAt: new Date().toISOString(),
      };

      await lootrackDb.transactions.put(updatedTransaction);

      return updatedTransaction;
    });
  }
}

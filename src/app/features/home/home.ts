import { Component, OnInit } from "@angular/core";
import { lootrackDb } from "../../data/database";
import { Transaction } from "../../data/models";

@Component({
  selector: "app-home",
  imports: [],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home implements OnInit {
  async ngOnInit(): Promise<void> {
    await this.testIndexedDb();
  }

  private async testIndexedDb(): Promise<void> {
    const existingTransactions = await lootrackDb.transactions.toArray();

    if (existingTransactions.length === 0) {
      const testTransaction: Transaction = {
        id: crypto.randomUUID(),
        type: "expense",
        amountInCents: 1250,
        description: "IndexedDB test",
        occurredOn: "2026-07-20",
        createdAt: new Date().toISOString(),
      };

      await lootrackDb.transactions.add(testTransaction);
    }

    const savedTransactions = await lootrackDb.transactions.toArray();

    console.log("Transactions from IndexedDB:", savedTransactions);
  }
}

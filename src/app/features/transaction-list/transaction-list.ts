import { Component, inject } from "@angular/core";
import { Store } from "@ngrx/store";
import { selectTransactionsState } from "../../state/transactions/transactions.selector";
import { AsyncPipe } from "@angular/common";
import { TransactionItem } from "./transaction-item/transaction-item";

@Component({
  selector: "app-transaction-list",
  imports: [AsyncPipe, TransactionItem],
  templateUrl: "./transaction-list.html",
  styleUrl: "./transaction-list.scss",
})
export class TransactionList {
  private readonly store = inject(Store);

  protected readonly transactionsState$ = this.store.select(
    selectTransactionsState,
  );
}

import { Component, inject, input } from "@angular/core";
import { Transaction } from "../../../data/models";
import { AsyncPipe, CurrencyPipe } from "@angular/common";
import { TuiButton, TuiExpand } from "@taiga-ui/core";
import { AmountPipe } from "../../../shared/pipes/amount-pipe";
import { Store } from "@ngrx/store";
import { selectTransactionsLoading } from "../../../state/transactions/transactions.selector";
import { deleteTransaction } from "../../../state/transactions/transactions.actions";

@Component({
  selector: "app-transaction-item",
  imports: [CurrencyPipe, AmountPipe, TuiButton, TuiExpand, AsyncPipe],
  templateUrl: "./transaction-item.html",
  styleUrl: "./transaction-item.scss",
})
export class TransactionItem {
  transaction = input.required<Transaction>();
  private readonly store = inject(Store);
  protected readonly loading$ = this.store.select(selectTransactionsLoading);
  protected expanded = false;

  onDeleteTransaction() {
    this.store.dispatch(deleteTransaction({ id: this.transaction().id }));
  }

  onEditTransaction() {}
}

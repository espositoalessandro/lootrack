import { AsyncPipe, JsonPipe } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { Store } from "@ngrx/store";

import { loadTransactions } from "../../state/transactions/transactions.actions";
import { selectTransactionsState } from "../../state/transactions/transactions.selector";

@Component({
  selector: "app-home",
  imports: [AsyncPipe, JsonPipe],
  templateUrl: "./home.html",
  styleUrl: "./home.scss",
})
export class Home implements OnInit {
  private readonly store = inject(Store);

  protected readonly transactionsState$ = this.store.select(
    selectTransactionsState,
  );

  ngOnInit(): void {
    this.store.dispatch(loadTransactions());
  }
}

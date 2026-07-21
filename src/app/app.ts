import { TuiLoader, TuiRoot } from "@taiga-ui/core";
import { Component, inject, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { FloatingFooter } from "./layout/floating-footer/floating-footer";
import { Store } from "@ngrx/store";
import { loadTransactions } from "./state/transactions/transactions.actions";
import { selectTransactionsLoading } from "./state/transactions/transactions.selector";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, TuiRoot, FloatingFooter, AsyncPipe, TuiLoader],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App implements OnInit {
  private readonly store = inject(Store);
  protected readonly transactionsLoading$ = this.store.select(
    selectTransactionsLoading,
  );
  ngOnInit(): void {
    this.store.dispatch(loadTransactions());
  }
}

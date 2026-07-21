import { TuiLoader, TuiRoot } from "@taiga-ui/core";
import { AsyncPipe } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Store } from "@ngrx/store";

import { DevDatabaseSeeder } from "./dev/dev-database-seeder.service";
import { FloatingFooter } from "./layout/floating-footer/floating-footer";
import { loadCategories } from "./state/categories/categories.actions";
import { loadTransactions } from "./state/transactions/transactions.actions";
import { selectTransactionsLoading } from "./state/transactions/transactions.selector";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, TuiRoot, FloatingFooter, AsyncPipe, TuiLoader],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App implements OnInit {
  private readonly store = inject(Store);
  private readonly databaseSeeder = inject(DevDatabaseSeeder);

  protected readonly transactionsLoading$ = this.store.select(
    selectTransactionsLoading,
  );

  ngOnInit(): void {
    void this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    try {
      await this.databaseSeeder.seed();
    } catch (error) {
      console.error("Unable to seed development database", error);
    }

    this.store.dispatch(loadCategories());
    this.store.dispatch(loadTransactions());
  }
}

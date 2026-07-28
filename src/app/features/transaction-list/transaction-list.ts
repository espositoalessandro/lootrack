import { CurrencyPipe } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { Store } from "@ngrx/store";
import {
  TuiSwipeActions,
  TuiSwipeActionsAutoClose,
} from "@taiga-ui/addon-mobile";
import { TuiButton, TuiIcon } from "@taiga-ui/core";
import { TuiSegmented } from "@taiga-ui/kit";

import { AmountPipe } from "../../shared/pipes/amount-pipe";
import { selectAppSettings } from "../../state/app-settings/app-settings.selector";
import {
  selectTransactionListGroups,
  type TransactionListFilter,
} from "../../state/transactions/transaction-list.selector";
import { deleteTransaction } from "../../state/transactions/transactions.actions";
import {
  selectTransactions,
  selectTransactionsLoading,
} from "../../state/transactions/transactions.selector";
import { TranslocoPipe } from "@jsverse/transloco";

@Component({
  selector: "app-transaction-list",
  imports: [
    AmountPipe,
    CurrencyPipe,
    TuiButton,
    TuiIcon,
    TuiSegmented,
    TuiSwipeActions,
    TuiSwipeActionsAutoClose,
    TranslocoPipe,
  ],
  templateUrl: "./transaction-list.html",
  styleUrl: "./transaction-list.scss",
})
export class TransactionList {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  private readonly currentDate = new Date();

  protected readonly transactions = this.store.selectSignal(selectTransactions);

  protected readonly settings = this.store.selectSignal(selectAppSettings);

  protected readonly loading = this.store.selectSignal(
    selectTransactionsLoading,
  );

  protected readonly selectedFilter = signal<TransactionListFilter>("all");

  protected readonly searchQuery = signal("");

  protected readonly transactionGroups = computed(() =>
    this.store.selectSignal(
      selectTransactionListGroups({
        filter: this.selectedFilter(),
        searchQuery: this.searchQuery(),
        currentDate: this.currentDate,
      }),
    )(),
  );

  protected setFilter(filter: TransactionListFilter): void {
    this.selectedFilter.set(filter);
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchQuery.set(input.value);
  }

  protected clearSearch(): void {
    this.searchQuery.set("");
  }

  protected editTransaction(id: string): void {
    void this.router.navigate([
      {
        outlets: {
          sheet: ["edit-transaction", id],
        },
      },
    ]);
  }

  protected requestDeleteTransaction(id: string): void {
    this.store.dispatch(deleteTransaction({ id }));
  }
}

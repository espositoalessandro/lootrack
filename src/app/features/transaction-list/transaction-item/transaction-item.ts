import { Component, computed, inject, input } from "@angular/core";
import { Transaction } from "../../../core/models/models";
import { AsyncPipe, CurrencyPipe } from "@angular/common";
import { TuiButton, TuiExpand } from "@taiga-ui/core";
import { AmountPipe } from "../../../shared/pipes/amount-pipe";
import { Store } from "@ngrx/store";
import { selectTransactionsLoading } from "../../../state/transactions/transactions.selector";
import { deleteTransaction } from "../../../state/transactions/transactions.actions";
import { Router } from "@angular/router";
import { TuiChip } from "@taiga-ui/kit";
import { selectCategoryById } from "../../../state/categories/categories.selector";

@Component({
  selector: "app-transaction-item",
  imports: [CurrencyPipe, AmountPipe, TuiButton, TuiExpand, AsyncPipe, TuiChip],
  templateUrl: "./transaction-item.html",
  styleUrl: "./transaction-item.scss",
})
export class TransactionItem {
  transaction = input.required<Transaction>();
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  protected readonly loading$ = this.store.select(selectTransactionsLoading);
  protected expanded = false;

  protected category = computed(() => {
    if (this.transaction().categoryId) {
      const category = this.store.selectSignal(
        selectCategoryById(this.transaction().categoryId!),
      );
      return category();
    }
    return null;
  });

  onDeleteTransaction() {
    this.store.dispatch(deleteTransaction({ id: this.transaction().id }));
  }

  protected onEditTransaction(): void {
    void this.router.navigate([
      {
        outlets: {
          sheet: ["edit-transaction", this.transaction().id],
        },
      },
    ]);
  }
}

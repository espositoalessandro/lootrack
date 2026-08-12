import { CurrencyPipe } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { Store } from "@ngrx/store";
import { TuiButton, TuiIcon, TuiTitle } from "@taiga-ui/core";
import { TuiSegmented } from "@taiga-ui/kit";

import type { TransactionType } from "../../core/models/models";
import { AmountPipe } from "../../shared/pipes/amount-pipe";
import { selectCategorySummariesByType } from "../../state/categories/categories.selector";
import {
  TuiSwipeActions,
  TuiSwipeActionsAutoClose,
} from "@taiga-ui/addon-mobile";
import { deleteCategory } from "../../state/categories/categories.actions";
import { Router } from "@angular/router";

@Component({
  selector: "app-categories",
  imports: [
    AmountPipe,
    CurrencyPipe,
    TuiButton,
    TuiIcon,
    TuiSegmented,
    TuiTitle,
    TuiSwipeActions,
    TuiSwipeActionsAutoClose,
  ],
  templateUrl: "./categories.html",
  styleUrl: "./categories.scss",
})
export class Categories {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly selectedType = signal<TransactionType>("expense");
  protected requestDeleteCategory(id: string): void {
    this.store.dispatch(deleteCategory({ id }));
  }
  protected readonly categorySummaries = computed(() =>
    this.store.selectSignal(
      selectCategorySummariesByType(this.selectedType()),
    )(),
  );

  protected readonly sectionTitle = computed(() =>
    this.selectedType() === "expense"
      ? "Expense categories"
      : "Income categories",
  );

  protected readonly sectionDescription = computed(() =>
    this.selectedType() === "expense"
      ? "Manage how your spending is organized"
      : "Manage how your income is organized",
  );

  protected addCategory(): void {
    void this.router.navigate(
      [
        {
          outlets: {
            sheet: ["new-category"],
          },
        },
      ],
      {
        queryParams: {
          type: this.selectedType(),
        },
      },
    );
  }

  protected editCategory(id: string): void {
    void this.router.navigate([
      {
        outlets: {
          sheet: ["edit-category", id],
        },
      },
    ]);
  }
}

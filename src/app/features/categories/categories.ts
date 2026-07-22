import { CurrencyPipe } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { Store } from "@ngrx/store";
import { TuiButton, TuiIcon, TuiTitle } from "@taiga-ui/core";
import { TuiSegmented } from "@taiga-ui/kit";

import type { TransactionType } from "../../data/models";
import { AmountPipe } from "../../shared/pipes/amount-pipe";
import { selectCategorySummariesByType } from "../../state/categories/categories.selector";

@Component({
  selector: "app-categories",
  imports: [
    AmountPipe,
    CurrencyPipe,
    TuiButton,
    TuiIcon,
    TuiSegmented,
    TuiTitle,
  ],
  templateUrl: "./categories.html",
  styleUrl: "./categories.scss",
})
export class Categories {
  private readonly store = inject(Store);

  protected readonly selectedType = signal<TransactionType>("expense");

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
    // TODO: Open the create-category sheet.
  }

  protected editCategory(id: string): void {
    // TODO: Open the edit-category sheet.
    console.debug("Edit category", id);
  }
}

import { TuiLoader, TuiRoot } from "@taiga-ui/core";
import { Component, inject, isDevMode, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { FloatingFooter } from "./layout/floating-footer/floating-footer";
import { Store } from "@ngrx/store";
import { loadTransactions } from "./state/transactions/transactions.actions";
import { selectTransactionsLoading } from "./state/transactions/transactions.selector";
import { AsyncPipe } from "@angular/common";

import { AddCategory, Category } from "./data/models";
import { lootrackDb } from "./data/database";

const MOCK_CATEGORIES = [
  { name: "Bills", type: "expense" },
  { name: "Home", type: "expense" },
  { name: "Subscriptions", type: "expense" },
  { name: "Investments", type: "expense" },
  { name: "Car", type: "expense" },
  { name: "Pets", type: "expense" },
  { name: "Clothes", type: "expense" },
  { name: "Going out", type: "expense" },
  { name: "Health", type: "expense" },
  { name: "Travel", type: "expense" },
  { name: "Extra", type: "expense" },
  { name: "Gifts", type: "expense" },
  { name: "Groceries", type: "expense" },

  { name: "Salary", type: "income" },
  { name: "Other", type: "income" },
  { name: "Gifts", type: "income" },
] as const satisfies readonly AddCategory[];

function normalizeCategoryName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function categoryKey(category: AddCategory): string {
  return `${category.type}:${normalizeCategoryName(category.name)}`;
}

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
    void this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    await this.seedMockCategories();

    this.store.dispatch(loadTransactions());
  }

  private async seedMockCategories(): Promise<void> {
    if (!isDevMode()) {
      return;
    }

    await lootrackDb.transaction("rw", lootrackDb.categories, async () => {
      const existingCategories = await lootrackDb.categories.toArray();

      const existingKeys = new Set(
        existingCategories.map((category) => categoryKey(category)),
      );

      const now = new Date().toISOString();

      const missingCategories: Category[] = MOCK_CATEGORIES.filter(
        (category) => !existingKeys.has(categoryKey(category)),
      ).map((category) => ({
        ...category,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }));

      if (missingCategories.length === 0) {
        return;
      }

      await lootrackDb.categories.bulkAdd(missingCategories);
    });
  }
}

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

import type { Transaction, TransactionType } from "../../data/models";
import { AmountPipe } from "../../shared/pipes/amount-pipe";
import { selectAppSettings } from "../../state/app-settings/app-settings.selector";
import { selectCategory } from "../../state/categories/categories.selector";
import { deleteTransaction } from "../../state/transactions/transactions.actions";
import {
  selectTransactions,
  selectTransactionsLoading,
} from "../../state/transactions/transactions.selector";

type TransactionFilter = "all" | TransactionType;

interface TransactionListItem {
  readonly transaction: Transaction;
  readonly categoryName: string;
}

interface TransactionDayGroup {
  readonly dateKey: string;
  readonly label: string;
  readonly items: TransactionListItem[];
}

interface TransactionMonthGroup {
  readonly monthKey: string;
  readonly label: string;
  readonly netInCents: number;
  readonly days: TransactionDayGroup[];
}

interface MutableTransactionMonthGroup {
  readonly monthKey: string;
  readonly label: string;
  netInCents: number;
  readonly daysByKey: Map<string, TransactionDayGroup>;
}

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
  ],
  templateUrl: "./transaction-list.html",
  styleUrl: "./transaction-list.scss",
})
export class TransactionList {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly transactions = this.store.selectSignal(selectTransactions);

  protected readonly categories = this.store.selectSignal(selectCategory);

  protected readonly settings = this.store.selectSignal(selectAppSettings);

  protected readonly loading = this.store.selectSignal(
    selectTransactionsLoading,
  );

  protected readonly selectedFilter = signal<TransactionFilter>("all");

  protected readonly searchQuery = signal("");

  protected readonly transactionGroups = computed<TransactionMonthGroup[]>(
    () => {
      const locale = this.settings().locale || "en";
      const selectedFilter = this.selectedFilter();

      const normalizedSearch = this.searchQuery()
        .trim()
        .toLocaleLowerCase(locale);

      const categoriesById = new Map(
        this.categories().map((category) => [category.id, category.name]),
      );

      const visibleTransactions = this.transactions()
        .filter(
          (transaction) =>
            selectedFilter === "all" || transaction.type === selectedFilter,
        )
        .map<TransactionListItem>((transaction) => ({
          transaction,
          categoryName: transaction.categoryId
            ? (categoriesById.get(transaction.categoryId) ?? "Uncategorized")
            : "Uncategorized",
        }))
        .filter((item) => {
          if (!normalizedSearch) {
            return true;
          }

          const searchableText = [
            item.transaction.description,
            item.categoryName,
            item.transaction.type,
          ]
            .join(" ")
            .toLocaleLowerCase(locale);

          return searchableText.includes(normalizedSearch);
        })
        .sort((first, second) => {
          const dateComparison = second.transaction.occurredOn.localeCompare(
            first.transaction.occurredOn,
          );

          if (dateComparison !== 0) {
            return dateComparison;
          }

          return second.transaction.createdAt.localeCompare(
            first.transaction.createdAt,
          );
        });

      const months = new Map<string, MutableTransactionMonthGroup>();

      for (const item of visibleTransactions) {
        const monthKey = item.transaction.occurredOn.slice(0, 7);
        const dateKey = item.transaction.occurredOn;

        let month = months.get(monthKey);

        if (!month) {
          month = {
            monthKey,
            label: this.formatMonthLabel(monthKey, locale),
            netInCents: 0,
            daysByKey: new Map<string, TransactionDayGroup>(),
          };

          months.set(monthKey, month);
        }

        month.netInCents +=
          item.transaction.type === "income"
            ? item.transaction.amountInCents
            : -item.transaction.amountInCents;

        let day = month.daysByKey.get(dateKey);

        if (!day) {
          day = {
            dateKey,
            label: this.formatDayLabel(dateKey, locale),
            items: [],
          };

          month.daysByKey.set(dateKey, day);
        }

        day.items.push(item);
      }

      return Array.from(months.values()).map((month) => ({
        monthKey: month.monthKey,
        label: month.label,
        netInCents: month.netInCents,
        days: Array.from(month.daysByKey.values()),
      }));
    },
  );

  protected setFilter(filter: TransactionFilter): void {
    this.selectedFilter.set(filter);
  }

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  protected clearSearch(): void {
    this.searchQuery.set("");
  }

  protected transactionTitle(item: TransactionListItem): string {
    const description = item.transaction.description.trim();

    if (description) {
      return description;
    }

    if (item.categoryName !== "Uncategorized") {
      return item.categoryName;
    }

    return item.transaction.type === "income" ? "Income" : "Expense";
  }

  protected categoryInitial(item: TransactionListItem): string {
    if (item.categoryName === "Uncategorized") {
      return item.transaction.type === "income" ? "I" : "E";
    }

    return item.categoryName.charAt(0).toLocaleUpperCase();
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

  private formatMonthLabel(monthKey: string, locale: string): string {
    const date = this.toLocalDate(`${monthKey}-01`);

    const label = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(date);

    return this.capitalize(label, locale);
  }

  private formatDayLabel(dateKey: string, locale: string): string {
    const today = new Date();
    const yesterday = new Date(today);

    yesterday.setDate(today.getDate() - 1);

    if (dateKey === this.toDateKey(today)) {
      return "Today";
    }

    if (dateKey === this.toDateKey(yesterday)) {
      return "Yesterday";
    }

    const label = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "short",
    }).format(this.toLocalDate(dateKey));

    return this.capitalize(label, locale);
  }

  private toLocalDate(value: string): Date {
    const [year = 1970, month = 1, day = 1] = value.split("-").map(Number);

    return new Date(year, month - 1, day);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  private capitalize(value: string, locale: string): string {
    if (!value) {
      return value;
    }

    return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
  }
}

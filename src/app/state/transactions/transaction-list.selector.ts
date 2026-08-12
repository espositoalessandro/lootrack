import { createSelector } from "@ngrx/store";

import type { Transaction, TransactionType } from "../../core/models/models";
import { selectAppSettings } from "../app-settings/app-settings.selector";
import { selectCategory } from "../categories/categories.selector";
import { selectTransactions } from "./transactions.selector";

const UNCATEGORIZED_LABEL = "Uncategorized";

export type TransactionListFilter = "all" | TransactionType;

export interface TransactionListCriteria {
  readonly filter: TransactionListFilter;
  readonly searchQuery: string;
  readonly currentDate: Date;
}

export interface TransactionListItem {
  readonly transaction: Transaction;
  readonly categoryName: string;
  readonly title: string;
  readonly symbol: string;
}

export interface TransactionDayGroup {
  readonly dateKey: string;
  readonly label: string;
  readonly items: TransactionListItem[];
}

export interface TransactionMonthGroup {
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

export const selectTransactionListGroups = (
  criteria: TransactionListCriteria,
) =>
  createSelector(
    selectTransactions,
    selectCategory,
    selectAppSettings,
    (transactions, categories, settings): TransactionMonthGroup[] => {
      const locale = settings.locale || "en-US";

      const normalizedSearch = criteria.searchQuery
        .trim()
        .toLocaleLowerCase(locale);

      const categoriesById = new Map(
        categories.map((category) => [category.id, category.name]),
      );

      const visibleTransactions = transactions
        .filter(
          (transaction) =>
            criteria.filter === "all" || transaction.type === criteria.filter,
        )
        .map<TransactionListItem>((transaction) => {
          const categoryName = transaction.categoryId
            ? (categoriesById.get(transaction.categoryId) ??
              UNCATEGORIZED_LABEL)
            : UNCATEGORIZED_LABEL;

          const description = transaction.description.trim();

          const title =
            description ||
            (categoryName !== UNCATEGORIZED_LABEL
              ? categoryName
              : transaction.type === "income"
                ? "Income"
                : "Expense");

          const symbol =
            categoryName === UNCATEGORIZED_LABEL
              ? transaction.type === "income"
                ? "I"
                : "E"
              : categoryName.charAt(0).toLocaleUpperCase(locale);

          return {
            transaction,
            categoryName,
            title,
            symbol,
          };
        })
        .filter((item) => {
          if (!normalizedSearch) {
            return true;
          }

          const searchableText = [
            item.title,
            item.categoryName,
            item.transaction.description,
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
            label: formatMonthLabel(monthKey, locale),
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
            label: formatDayLabel(dateKey, locale, criteria.currentDate),
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

function formatMonthLabel(monthKey: string, locale: string): string {
  const date = toLocalDate(`${monthKey}-01`);

  const label = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(date);

  return capitalize(label, locale);
}

function formatDayLabel(
  dateKey: string,
  locale: string,
  currentDate: Date,
): string {
  const yesterday = new Date(currentDate);

  yesterday.setDate(currentDate.getDate() - 1);

  if (dateKey === toDateKey(currentDate)) {
    return "Today";
  }

  if (dateKey === toDateKey(yesterday)) {
    return "Yesterday";
  }

  const label = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(toLocalDate(dateKey));

  return capitalize(label, locale);
}

function toLocalDate(value: string): Date {
  const [year = 1970, month = 1, day = 1] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function capitalize(value: string, locale: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
}

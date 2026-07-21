import { Injectable, isDevMode } from "@angular/core";

import { lootrackDb } from "../data/database";
import {
  AddCategory,
  Category,
  Transaction,
  TransactionType,
} from "../data/models";
import { categoryKey } from "../data/category-name";

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

interface MockTransaction {
  id: string;
  type: TransactionType;
  amountInCents: number;
  description: string;
  categoryName: string;
  day: number;
}

const MOCK_TRANSACTIONS = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    type: "income",
    amountInCents: 195_000,
    description: "Monthly salary",
    categoryName: "Salary",
    day: 1,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    type: "expense",
    amountInCents: 6_345,
    description: "Weekly groceries",
    categoryName: "Groceries",
    day: 3,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    type: "expense",
    amountInCents: 4_000,
    description: "Internet bill",
    categoryName: "Bills",
    day: 4,
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    type: "expense",
    amountInCents: 12_000,
    description: "Dog kindergarten",
    categoryName: "Pets",
    day: 5,
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    type: "expense",
    amountInCents: 4_850,
    description: "Dinner out",
    categoryName: "Going out",
    day: 7,
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    type: "expense",
    amountInCents: 1_830,
    description: "Pharmacy",
    categoryName: "Health",
    day: 9,
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    type: "expense",
    amountInCents: 2_900,
    description: "Train tickets",
    categoryName: "Travel",
    day: 11,
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    type: "expense",
    amountInCents: 2_490,
    description: "Home supplies",
    categoryName: "Home",
    day: 12,
  },
  {
    id: "10000000-0000-4000-8000-000000000009",
    type: "expense",
    amountInCents: 1_299,
    description: "Software subscription",
    categoryName: "Subscriptions",
    day: 14,
  },
  {
    id: "10000000-0000-4000-8000-000000000010",
    type: "expense",
    amountInCents: 15_000,
    description: "ETF contribution",
    categoryName: "Investments",
    day: 16,
  },
  {
    id: "10000000-0000-4000-8000-000000000011",
    type: "expense",
    amountInCents: 5_990,
    description: "New jacket",
    categoryName: "Clothes",
    day: 18,
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    type: "income",
    amountInCents: 5_000,
    description: "Birthday gift",
    categoryName: "Gifts",
    day: 20,
  },
] as const satisfies readonly MockTransaction[];

@Injectable({
  providedIn: "root",
})
export class DevDatabaseSeeder {
  async seed(): Promise<void> {
    if (!isDevMode()) {
      return;
    }

    await lootrackDb.transaction(
      "rw",
      lootrackDb.categories,
      lootrackDb.transactions,
      async () => {
        const categories = await this.seedCategories();

        await this.seedTransactions(categories);
      },
    );
  }

  private async seedCategories(): Promise<Map<string, Category>> {
    const existingCategories = await lootrackDb.categories.toArray();

    const categoriesByKey = new Map(
      existingCategories.map((category) => [categoryKey(category), category]),
    );

    const timestamp = new Date().toISOString();

    const missingCategories: Category[] = MOCK_CATEGORIES.filter(
      (category) => !categoriesByKey.has(categoryKey(category)),
    ).map((category) => ({
      ...category,
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }));

    if (missingCategories.length > 0) {
      await lootrackDb.categories.bulkAdd(missingCategories);

      for (const category of missingCategories) {
        categoriesByKey.set(categoryKey(category), category);
      }
    }

    return categoriesByKey;
  }

  private async seedTransactions(
    categoriesByKey: ReadonlyMap<string, Category>,
  ): Promise<void> {
    const mockIds = MOCK_TRANSACTIONS.map((transaction) => transaction.id);

    const existingTransactions = await lootrackDb.transactions.bulkGet(mockIds);

    const existingIds = new Set(
      existingTransactions
        .filter(
          (transaction): transaction is Transaction =>
            transaction !== undefined,
        )
        .map((transaction) => transaction.id),
    );

    const timestamp = new Date().toISOString();

    const missingTransactions: Transaction[] = MOCK_TRANSACTIONS.filter(
      (transaction) => !existingIds.has(transaction.id),
    ).map(({ categoryName, day, ...transaction }) => {
      const category = categoriesByKey.get(
        categoryKey({
          name: categoryName,
          type: transaction.type,
        }),
      );

      if (!category) {
        throw new Error(
          `Mock category "${categoryName}" was not found for ${transaction.type}`,
        );
      }

      return {
        ...transaction,
        categoryId: category.id,
        occurredOn: this.currentMonthDate(day),
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      };
    });

    if (missingTransactions.length > 0) {
      await lootrackDb.transactions.bulkAdd(missingTransactions);
    }
  }

  private currentMonthDate(day: number): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(day, lastDay);

    return [
      year,
      String(month + 1).padStart(2, "0"),
      String(safeDay).padStart(2, "0"),
    ].join("-");
  }
}

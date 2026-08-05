import { createFeatureSelector, createSelector } from "@ngrx/store";

import type { Category, TransactionType } from "../../core/data/models";
import type { CategoriesState } from "./categories.reducer";
import { selectTransactions } from "../transactions/transactions.selector";

export interface CategorySummary {
  readonly category: Category;
  readonly transactionCount: number;
  readonly totalInCents: number;
}

export const selectCategoryState =
  createFeatureSelector<CategoriesState>("categories");

export const selectCategory = createSelector(
  selectCategoryState,
  (state) => state.items,
);

export const selectCategoryLoading = createSelector(
  selectCategoryState,
  (state) => state.loading,
);

export const selectCategoryError = createSelector(
  selectCategoryState,
  (state) => state.error,
);

export const selectCategoryById = (id: string) =>
  createSelector(selectCategory, (categories) =>
    categories.find((category) => category.id === id),
  );

export const selectCategoriesByType = (type: TransactionType) =>
  createSelector(selectCategory, (categories) =>
    categories.filter((category) => category.type === type),
  );

export const selectCategorySummariesByType = (type: TransactionType) =>
  createSelector(
    selectCategoriesByType(type),
    selectTransactions,
    (categories, transactions): CategorySummary[] =>
      categories
        .map((category) => {
          const categoryTransactions = transactions.filter(
            (transaction) =>
              transaction.type === type &&
              transaction.categoryId === category.id,
          );

          return {
            category,
            transactionCount: categoryTransactions.length,
            totalInCents: categoryTransactions.reduce(
              (total, transaction) => total + transaction.amountInCents,
              0,
            ),
          };
        })
        .sort((a, b) => a.category.name.localeCompare(b.category.name)),
  );

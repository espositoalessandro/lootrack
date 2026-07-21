import { createFeatureSelector, createSelector } from "@ngrx/store";

import type { CategoriesState } from "./categories.reducer";
import { TransactionType } from "../../data/models";

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

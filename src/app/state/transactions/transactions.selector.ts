import { createFeatureSelector, createSelector } from "@ngrx/store";

import type { TransactionsState } from "./transactions.reducer";

export const selectTransactionsState =
  createFeatureSelector<TransactionsState>("transactions");

export const selectTransactions = createSelector(
  selectTransactionsState,
  (state) => state.items,
);

export const selectTransactionsLoading = createSelector(
  selectTransactionsState,
  (state) => state.loading,
);

export const selectTransactionsError = createSelector(
  selectTransactionsState,
  (state) => state.error,
);

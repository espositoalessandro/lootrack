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

export const selectTransactionById = (id: string) =>
  createSelector(selectTransactions, (transactions) =>
    transactions.find((transaction) => transaction.id === id),
  );

export const selectNetTotalByMonth = (month: string) =>
  createSelector(selectTransactions, (transactions) =>
    transactions
      .filter((transaction) => transaction.occurredOn.startsWith(month))
      .reduce(
        (total, transaction) =>
          total +
          (transaction.type === "income"
            ? transaction.amountInCents
            : -transaction.amountInCents),
        0,
      ),
  );

export const selectTotalsByMonth = (month: string) =>
  createSelector(selectTransactions, (transactions) => {
    let totalIncome = 0;
    let totalExpense = 0;
    for (const transaction of transactions) {
      if (!transaction.occurredOn.startsWith(month)) {
        continue;
      }

      if (transaction.type === "income") {
        totalIncome += transaction.amountInCents;
      } else {
        totalExpense += transaction.amountInCents;
      }
    }
    return { totalIncome, totalExpense };
  });

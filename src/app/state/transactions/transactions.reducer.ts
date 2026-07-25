import { createReducer, on } from "@ngrx/store";

import type { Transaction } from "../../data/models";
import {
  addTransaction,
  addTransactionFailure,
  addTransactionSuccess,
  deleteTransaction,
  deleteTransactionFailure,
  deleteTransactionSuccess,
  loadTransactions,
  loadTransactionsFailure,
  loadTransactionsSuccess,
  updateTransaction,
  updateTransactionFailure,
  updateTransactionSuccess,
} from "./transactions.actions";
import { addCategorySuccess } from "../categories/categories.actions";

export interface TransactionsState {
  items: Transaction[];
  loading: boolean;
  error: string | null;
}

export const initialTransactionsState: TransactionsState = {
  items: [],
  loading: false,
  error: null,
};

export const transactionsReducer = createReducer(
  initialTransactionsState,

  on(loadTransactions, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(loadTransactionsSuccess, (state, { transactions }) => ({
    ...state,
    items: transactions,
    loading: false,
    error: null,
  })),

  on(loadTransactionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(addTransaction, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(addTransactionSuccess, (state, { transaction }) => ({
    ...state,
    items: [transaction, ...state.items],
    loading: false,
    error: null,
  })),

  on(addTransactionFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(deleteTransaction, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(deleteTransactionSuccess, (state, { id }) => ({
    ...state,
    items: state.items.filter((transaction) => transaction.id !== id),
    loading: false,
    error: null,
  })),

  on(deleteTransactionFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(updateTransaction, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(updateTransactionSuccess, (state, { updatedTransaction }) => ({
    ...state,
    items: state.items.map((item) =>
      item.id === updatedTransaction.id ? updatedTransaction : item,
    ),
    loading: false,
    error: null,
  })),

  on(updateTransactionFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(addCategorySuccess, (state, { transactions }) => ({
    ...state,
    items:
      transactions.length > 0
        ? state.items.map((item) => {
            const transaction = transactions.find(
              (transaction) => item.id === transaction.id,
            );
            return transaction ? transaction : item;
          })
        : state.items,
  })),
);

import { createReducer, on } from "@ngrx/store";

import type { Transaction } from "../../data/models";
import {
  addTransactions,
  addTransactionsFailure,
  addTransactionsSuccess,
  loadTransactions,
  loadTransactionsFailure,
  loadTransactionsSuccess,
} from "./transactions.actions";

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

  on(addTransactions, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(addTransactionsSuccess, (state, { transaction }) => ({
    ...state,
    item: transaction,
    loading: false,
    error: null,
  })),

  on(addTransactionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
);

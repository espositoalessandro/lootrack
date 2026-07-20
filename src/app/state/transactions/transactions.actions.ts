import { createAction, props } from "@ngrx/store";

import type { AddTransaction, Transaction } from "../../data/models";

export const loadTransactions = createAction(
  "[Transactions Page] Load Requested",
);

export const loadTransactionsSuccess = createAction(
  "[Transactions Database] Load Succeeded",
  props<{ transactions: Transaction[] }>(),
);

export const loadTransactionsFailure = createAction(
  "[Transactions Database] Load Failed",
  props<{ error: string }>(),
);

export const addTransaction = createAction(
  "[New Transaction Page] Add Requested",
  props<{ transaction: AddTransaction }>(),
);

export const addTransactionSuccess = createAction(
  "[Transactions Database] Add Succeeded",
);

export const addTransactionFailure = createAction(
  "[Transactions Database] Add Failed",
  props<{ error: string }>(),
);

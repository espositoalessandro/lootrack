import { createAction, props } from "@ngrx/store";

import type { AddTransaction, Transaction } from "../../core/data/models";

export const loadTransactions = createAction("[Transactions] Load Requested");

export const loadTransactionsSuccess = createAction(
  "[Transactions Database] Load Succeeded",
  props<{ transactions: Transaction[] }>(),
);

export const loadTransactionsFailure = createAction(
  "[Transactions Database] Load Failed",
  props<{ error: string }>(),
);

export const addTransaction = createAction(
  "[TransactionService] Add Requested",
  props<{ transaction: AddTransaction }>(),
);

export const addTransactionSuccess = createAction(
  "[Transactions Database] Add Succeeded",
  props<{ transaction: Transaction }>(),
);

export const addTransactionFailure = createAction(
  "[Transactions Database] Add Failed",
  props<{ error: string }>(),
);

export const deleteTransaction = createAction(
  "[TransactionService] Delete Requested",
  props<{ id: string }>(),
);

export const deleteTransactionSuccess = createAction(
  "[Transactions Database] Delete Succeeded",
  props<{ id: string }>(),
);

export const deleteTransactionFailure = createAction(
  "[Transactions Database] Delete Failed",
  props<{ error: string }>(),
);

export const updateTransaction = createAction(
  "[TransactionService] Update Requested",
  props<{ id: string; changes: AddTransaction }>(),
);

export const updateTransactionSuccess = createAction(
  "[Transactions Database] Update Succeeded",
  props<{ updatedTransaction: Transaction }>(),
);

export const updateTransactionFailure = createAction(
  "[Transactions Database] Update Failed",
  props<{ error: string }>(),
);

export const generalTransactionFailure = createAction(
  "[TransactionService Database] TransactionService error",
  props<{ error: string }>(),
);

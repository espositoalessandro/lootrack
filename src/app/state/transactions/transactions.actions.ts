import { createAction, props } from "@ngrx/store";

import type { Transaction } from "../../data/models";

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

export const addTransactions = createAction(
  "[Transactions Page] Add Requested",
  props<{ transactions: Transaction[] }>(),
);

export const addTransactionsSuccess = createAction(
  "[Transactions Database] Add Succeeded",
  props<{ transaction: Transaction }>(),
);

export const addTransactionsFailure = createAction(
  "[Transactions Database] Add Failed",
  props<{ error: string }>(),
);

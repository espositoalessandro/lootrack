import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import {
  catchError,
  concatMap,
  EMPTY,
  exhaustMap,
  map,
  of,
  switchMap,
} from "rxjs";

import { TransactionsRepository } from "../../data/repositories/transactions-repository";
import {
  addTransaction,
  addTransactionFailure,
  addTransactionSuccess,
  deleteTransaction,
  deleteTransactionFailure,
  deleteTransactionSuccess,
  generalTransactionFailure,
  loadTransactions,
  loadTransactionsFailure,
  loadTransactionsSuccess,
  updateTransaction,
  updateTransactionFailure,
  updateTransactionSuccess,
} from "./transactions.actions";
import { TuiDialogService } from "@taiga-ui/core";

@Injectable()
export class TransactionsEffects {
  private readonly actions$ = inject(Actions);
  private readonly dialogs = inject(TuiDialogService);
  private readonly transactionsDatabase = inject(TransactionsRepository);

  readonly loadTransactions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTransactions),

      switchMap(() =>
        this.transactionsDatabase.getActive().pipe(
          map((transactions) => loadTransactionsSuccess({ transactions })),

          catchError((error: unknown) =>
            of(
              loadTransactionsFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to load transactions",
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly addTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addTransaction),

      concatMap(({ transaction }) =>
        this.transactionsDatabase.add(transaction).pipe(
          map((newTransaction) =>
            addTransactionSuccess({ transaction: newTransaction }),
          ),

          catchError((error: unknown) =>
            of(
              addTransactionFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to add transaction",
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly deleteTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteTransaction),
      concatMap(({ id }) =>
        this.transactionsDatabase.remove(id).pipe(
          map(() => deleteTransactionSuccess({ id })),
          catchError((error: unknown) =>
            of(
              deleteTransactionFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to delete transaction",
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly updateTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateTransaction),

      concatMap(({ id, changes }) =>
        this.transactionsDatabase.update(id, changes).pipe(
          map((transaction) =>
            updateTransactionSuccess({
              updatedTransaction: transaction,
            }),
          ),

          catchError((error: unknown) =>
            of(
              updateTransactionFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to update transaction",
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly showGeneralTransactionError$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(generalTransactionFailure),
        exhaustMap(({ error }) =>
          this.dialogs
            .open(error, {
              label: "Error in transaction operation",
              size: "s",
            })
            .pipe(catchError(() => EMPTY)),
        ),
      ),
    { dispatch: false },
  );
}

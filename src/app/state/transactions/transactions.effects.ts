import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, concatMap, map, of, switchMap } from "rxjs";

import { TransactionsDatabaseService } from "../../data/transactions-database.service";
import {
  addTransaction,
  addTransactionFailure,
  addTransactionSuccess,
  loadTransactions,
  loadTransactionsFailure,
  loadTransactionsSuccess,
} from "./transactions.actions";

@Injectable()
export class TransactionsEffects {
  private readonly actions$ = inject(Actions);

  private readonly transactionsDatabase = inject(TransactionsDatabaseService);

  readonly loadTransactions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTransactions),

      switchMap(() =>
        this.transactionsDatabase.getAll().pipe(
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
}

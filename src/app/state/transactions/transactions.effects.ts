import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, from, map, mergeMap, of, switchMap } from "rxjs";

import { TransactionsDatabaseService } from "../../data/transactions-database.service";
import {
  addTransactions,
  addTransactionsFailure,
  addTransactionsSuccess,
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

  readonly addTransactions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addTransactions),
      switchMap(({ transactions }) =>
        from(transactions).pipe(
          mergeMap((transaction) =>
            this.transactionsDatabase.add(transaction).pipe(
              map(() => addTransactionsSuccess({ transaction: transaction })),
              catchError((error: unknown) =>
                of(
                  addTransactionsFailure({
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
      ),
    ),
  );
}

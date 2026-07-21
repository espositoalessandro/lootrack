import { TestBed } from "@angular/core/testing";
import { provideMockActions } from "@ngrx/effects/testing";
import type { Action } from "@ngrx/store";
import { firstValueFrom, of, Subject, throwError } from "rxjs";

import type { AddTransaction, Transaction } from "../../data/models";
import { TransactionsRepository } from "../../data/transactions-repository";
import {
  addTransaction,
  addTransactionSuccess,
  deleteTransaction,
  deleteTransactionSuccess,
  loadTransactions,
  loadTransactionsFailure,
  loadTransactionsSuccess,
  updateTransaction,
  updateTransactionFailure,
  updateTransactionSuccess,
} from "./transactions.actions";
import { TransactionsEffects } from "./transactions.effects";

const transactionInput: AddTransaction = {
  type: "expense",
  amountInCents: 1250,
  description: "Lunch",
  occurredOn: "2026-07-21",
};

const storedTransaction: Transaction = {
  ...transactionInput,
  id: "transaction-1",
  createdAt: "2026-07-21T10:00:00.000Z",
};

describe("TransactionsEffects", () => {
  let actions$: Subject<Action>;
  let effects: TransactionsEffects;

  let database: {
    getAll: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    actions$ = new Subject<Action>();

    database = {
      getAll: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      update: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TransactionsEffects,
        provideMockActions(() => actions$),
        {
          provide: TransactionsRepository,
          useValue: database,
        },
      ],
    });

    effects = TestBed.inject(TransactionsEffects);
  });

  it("should load transactions successfully", async () => {
    database.getAll.mockReturnValue(of([storedTransaction]));

    const resultPromise = firstValueFrom(effects.loadTransactions$);

    actions$.next(loadTransactions());

    const result = await resultPromise;

    expect(database.getAll).toHaveBeenCalledOnce();
    expect(result).toEqual(
      loadTransactionsSuccess({
        transactions: [storedTransaction],
      }),
    );
  });

  it("should return a failure action when loading fails", async () => {
    database.getAll.mockReturnValue(
      throwError(() => new Error("IndexedDB unavailable")),
    );

    const resultPromise = firstValueFrom(effects.loadTransactions$);

    actions$.next(loadTransactions());

    const result = await resultPromise;

    expect(result).toEqual(
      loadTransactionsFailure({
        error: "IndexedDB unavailable",
      }),
    );
  });

  it("should add a transaction successfully", async () => {
    database.add.mockReturnValue(of(storedTransaction));

    const resultPromise = firstValueFrom(effects.addTransaction$);

    actions$.next(
      addTransaction({
        transaction: transactionInput,
      }),
    );

    const result = await resultPromise;

    expect(database.add).toHaveBeenCalledWith(transactionInput);
    expect(result).toEqual(
      addTransactionSuccess({
        transaction: storedTransaction,
      }),
    );
  });

  it("should delete a transaction successfully", async () => {
    database.remove.mockReturnValue(of(storedTransaction.id));

    const resultPromise = firstValueFrom(effects.deleteTransaction$);

    actions$.next(
      deleteTransaction({
        id: storedTransaction.id,
      }),
    );

    const result = await resultPromise;

    expect(database.remove).toHaveBeenCalledWith(storedTransaction.id);
    expect(result).toEqual(
      deleteTransactionSuccess({
        id: storedTransaction.id,
      }),
    );
  });

  it("should update a transaction successfully", async () => {
    const changes: AddTransaction = {
      ...transactionInput,
      amountInCents: 2000,
      description: "Dinner",
    };

    const updatedTransaction: Transaction = {
      ...storedTransaction,
      ...changes,
    };

    database.update.mockReturnValue(of(updatedTransaction));

    const resultPromise = firstValueFrom(effects.updateTransaction$);

    actions$.next(
      updateTransaction({
        id: storedTransaction.id,
        changes,
      }),
    );

    const result = await resultPromise;

    expect(database.update).toHaveBeenCalledWith(storedTransaction.id, changes);

    expect(result).toEqual(
      updateTransactionSuccess({
        updatedTransaction,
      }),
    );
  });

  it("should return a failure action when updating fails", async () => {
    database.update.mockReturnValue(
      throwError(() => new Error("Transaction not found")),
    );

    const resultPromise = firstValueFrom(effects.updateTransaction$);

    actions$.next(
      updateTransaction({
        id: "missing-id",
        changes: transactionInput,
      }),
    );

    const result = await resultPromise;

    expect(result).toEqual(
      updateTransactionFailure({
        error: "Transaction not found",
      }),
    );
  });
});

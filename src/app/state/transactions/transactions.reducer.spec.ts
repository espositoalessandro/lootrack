import type { Transaction } from "../../data/models";
import {
  addTransactionSuccess,
  deleteTransactionSuccess,
  loadTransactions,
  loadTransactionsFailure,
  loadTransactionsSuccess,
  updateTransactionSuccess,
} from "./transactions.actions";
import {
  initialTransactionsState,
  transactionsReducer,
} from "./transactions.reducer";

const expense: Transaction = {
  id: "expense-1",
  type: "expense",
  amountInCents: 1250,
  description: "Lunch",
  occurredOn: "2026-07-21",
  createdAt: "2026-07-21T10:00:00.000Z",
};

const income: Transaction = {
  id: "income-1",
  type: "income",
  amountInCents: 195000,
  description: "Salary",
  occurredOn: "2026-07-01",
  createdAt: "2026-07-01T08:00:00.000Z",
};

describe("transactionsReducer", () => {
  it("should return the initial state for an unknown action", () => {
    const result = transactionsReducer(undefined, {
      type: "[Test] Unknown Action",
    });

    expect(result).toEqual(initialTransactionsState);
  });

  it("should set loading when transactions are requested", () => {
    const state = {
      ...initialTransactionsState,
      error: "Previous error",
    };

    const result = transactionsReducer(state, loadTransactions());

    expect(result).toEqual({
      items: [],
      loading: true,
      error: null,
    });
  });

  it("should store loaded transactions", () => {
    const state = {
      ...initialTransactionsState,
      loading: true,
    };

    const result = transactionsReducer(
      state,
      loadTransactionsSuccess({
        transactions: [expense, income],
      }),
    );

    expect(result).toEqual({
      items: [expense, income],
      loading: false,
      error: null,
    });
  });

  it("should prepend a newly added transaction", () => {
    const state = {
      ...initialTransactionsState,
      items: [expense],
    };

    const result = transactionsReducer(
      state,
      addTransactionSuccess({
        transaction: income,
      }),
    );

    expect(result.items).toEqual([income, expense]);
    expect(result.loading).toBe(false);
  });

  it("should remove the deleted transaction", () => {
    const state = {
      ...initialTransactionsState,
      items: [expense, income],
    };

    const result = transactionsReducer(
      state,
      deleteTransactionSuccess({
        id: expense.id,
      }),
    );

    expect(result.items).toEqual([income]);
  });

  it("should replace an updated transaction", () => {
    const updatedExpense: Transaction = {
      ...expense,
      amountInCents: 2000,
      description: "Dinner",
    };

    const state = {
      ...initialTransactionsState,
      items: [expense, income],
    };

    const result = transactionsReducer(
      state,
      updateTransactionSuccess({
        updatedTransaction: updatedExpense,
      }),
    );

    expect(result.items).toEqual([updatedExpense, income]);

    // NgRx reducers must not mutate their input state.
    expect(result).not.toBe(state);
    expect(state.items).toEqual([expense, income]);
  });

  it("should expose a loading error", () => {
    const state = {
      ...initialTransactionsState,
      loading: true,
    };

    const result = transactionsReducer(
      state,
      loadTransactionsFailure({
        error: "Database unavailable",
      }),
    );

    expect(result).toEqual({
      items: [],
      loading: false,
      error: "Database unavailable",
    });
  });
});

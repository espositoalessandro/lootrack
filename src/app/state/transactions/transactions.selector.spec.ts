import type { Transaction } from "../../data/models";
import type { TransactionsState } from "./transactions.reducer";
import {
  selectTransactionById,
  selectTransactions,
  selectTransactionsError,
  selectTransactionsLoading,
} from "./transactions.selector";

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

describe("transaction selectors", () => {
  const state: TransactionsState = {
    items: [expense, income],
    loading: true,
    error: "Database unavailable",
  };

  it("should select all transactions", () => {
    const result = selectTransactions.projector(state);

    expect(result).toEqual([expense, income]);
  });

  it("should select the loading state", () => {
    const result = selectTransactionsLoading.projector(state);

    expect(result).toBe(true);
  });

  it("should select the current error", () => {
    const result = selectTransactionsError.projector(state);

    expect(result).toBe("Database unavailable");
  });

  it("should find a transaction by id", () => {
    const selector = selectTransactionById(expense.id);

    const result = selector.projector([expense, income]);

    expect(result).toEqual(expense);
  });

  it("should return undefined when the transaction does not exist", () => {
    const selector = selectTransactionById("missing-id");

    const result = selector.projector([expense, income]);

    expect(result).toBeUndefined();
  });
});

import { firstValueFrom } from "rxjs";

import type { AddTransaction, Transaction } from "./models";
import { lootrackDb } from "./database";
import { TransactionsDatabaseService } from "./transactions-database.service";

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

describe("TransactionsDatabaseService", () => {
  let service: TransactionsDatabaseService;

  beforeEach(async () => {
    service = new TransactionsDatabaseService();

    await lootrackDb.transactions.clear();
  });

  afterAll(async () => {
    await lootrackDb.delete();
  });

  it("should return every stored transaction", async () => {
    const secondTransaction: Transaction = {
      id: "transaction-2",
      type: "income",
      amountInCents: 195000,
      description: "Salary",
      occurredOn: "2026-07-01",
      createdAt: "2026-07-01T08:00:00.000Z",
    };

    await lootrackDb.transactions.bulkAdd([
      storedTransaction,
      secondTransaction,
    ]);

    const result = await firstValueFrom(service.getAll());

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([storedTransaction, secondTransaction]),
    );
  });

  it("should create and persist a transaction", async () => {
    const beforeCreation = Date.now();

    const result = await firstValueFrom(service.add(transactionInput));

    const afterCreation = Date.now();

    expect(result).toMatchObject(transactionInput);

    expect(result.id).toEqual(expect.any(String));
    expect(result.id.length).toBeGreaterThan(0);

    const createdAtTimestamp = Date.parse(result.createdAt);

    expect(createdAtTimestamp).toBeGreaterThanOrEqual(beforeCreation);
    expect(createdAtTimestamp).toBeLessThanOrEqual(afterCreation);

    const persistedTransaction = await lootrackDb.transactions.get(result.id);

    expect(persistedTransaction).toEqual(result);
  });

  it("should delete a transaction", async () => {
    await lootrackDb.transactions.add(storedTransaction);

    const result = await firstValueFrom(service.remove(storedTransaction.id));

    const persistedTransaction = await lootrackDb.transactions.get(
      storedTransaction.id,
    );

    expect(result).toBe(storedTransaction.id);
    expect(persistedTransaction).toBeUndefined();
  });

  it("should update an existing transaction", async () => {
    await lootrackDb.transactions.add(storedTransaction);

    const changes: AddTransaction = {
      type: "expense",
      amountInCents: 2000,
      description: "Dinner",
      occurredOn: "2026-07-22",
    };

    const result = await firstValueFrom(
      service.update(storedTransaction.id, changes),
    );

    expect(result).toEqual({
      ...storedTransaction,
      ...changes,
    });

    const persistedTransaction = await lootrackDb.transactions.get(
      storedTransaction.id,
    );

    expect(persistedTransaction).toEqual(result);
  });

  it("should preserve database-generated fields when updating", async () => {
    await lootrackDb.transactions.add(storedTransaction);

    const changes: AddTransaction = {
      ...transactionInput,
      description: "Updated description",
    };

    const result = await firstValueFrom(
      service.update(storedTransaction.id, changes),
    );

    expect(result.id).toBe(storedTransaction.id);
    expect(result.createdAt).toBe(storedTransaction.createdAt);
  });

  it("should fail when updating a missing transaction", async () => {
    await expect(
      firstValueFrom(service.update("missing-id", transactionInput)),
    ).rejects.toThrow("Transaction not found");
  });
});

export class CategoryInUseError extends Error {
  constructor(readonly transactionCount: number) {
    super(
      `Category is used by ${transactionCount} active ${
        transactionCount === 1 ? "transaction" : "transactions"
      }`,
    );
  }
}

export class InvalidTransactionError extends Error {
  constructor(override message: string) {
    super(message);
  }
}

export type InvalidCategoryReferenceReason =
  "not-found" | "deleted" | "type-mismatch";

export class InvalidCategoryReferenceError extends Error {
  constructor(
    readonly categoryId: string,
    readonly reason: InvalidCategoryReferenceReason,
  ) {
    super(`Invalid category reference: ${reason}`);
  }
}

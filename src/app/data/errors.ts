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

export class CategoryAlreadyExistsError extends Error {
  constructor(override readonly message: string) {
    super(message ?? `Category of this type with this name already exists`);
  }
}

export class EditTransactionOnCategoryCreateError extends Error {
  constructor(message?: string) {
    super(message ?? `Error while updating selected transactions`);
  }
}

export class CategoryTypeChangeBlockedError extends Error {
  constructor(readonly transactionCount: number) {
    super(
      `Category type cannot be changed because it is assigned to ${
        transactionCount === 1
          ? "1 active transaction"
          : `${transactionCount} active transactions`
      }`,
    );
  }
}

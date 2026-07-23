export class CategoryInUseError extends Error {
  constructor(readonly transactionCount: number) {
    super(
      `Category is used by ${transactionCount} active ${
        transactionCount === 1 ? "transaction" : "transactions"
      }`,
    );
  }
}

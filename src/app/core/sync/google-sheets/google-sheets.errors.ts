export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly googleStatus: string | null,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

export class GoogleSheetsDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSheetsDataError";
  }
}

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

export class GoogleSheetsWriteConflictError extends Error {
  constructor(
    readonly entityType: string,
    readonly entityId: string,
  ) {
    super(
      `Remote ${entityType} ${entityId} changed before it could be updated`,
    );

    this.name = "GoogleSheetsWriteConflictError";
  }
}

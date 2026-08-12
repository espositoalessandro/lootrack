import { Injectable } from "@angular/core";
import {
  GoogleApiError,
  GoogleSheetsDataError,
  GoogleSheetsWriteConflictError,
} from "./google-sheets.errors";
import {
  Category,
  RemoteSyncRecord,
  RemoteSyncSnapshot,
  SyncMutation,
  SyncPushRequest,
  SyncPushResult,
  Transaction,
  TransactionType,
} from "../../models/models";

const SHEETS_API_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

const TRANSACTIONS_SHEET = "Transactions";
const CATEGORIES_SHEET = "Categories";
const META_SHEET = "_Meta";

const TRANSACTION_HEADERS = [
  "id",
  "type",
  "amountInCents",
  "description",
  "occurredOn",
  "categoryId",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "revision",
  "lastMutationId",
] as const;

const CATEGORY_HEADERS = [
  "id",
  "type",
  "name",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "revision",
  "lastMutationId",
] as const;

const META_VALUES = [
  ["key", "value"],
  ["appId", "lootrack"],
  ["schemaVersion", "1"],
] as const;

interface GoogleApiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface GoogleSpreadsheetResponse {
  spreadsheetId?: string;
  properties?: {
    title?: string;
  };
  sheets?: {
    properties?: {
      sheetId?: number;
      title?: string;
      hidden?: boolean;
    };
  }[];
}

export interface CreatedGoogleSpreadsheet {
  spreadsheetId: string;
}
type GoogleSheetCell = string | number | boolean;

interface GoogleValueRangeResponse {
  range?: string;
  majorDimension?: "ROWS" | "COLUMNS";
  values?: GoogleSheetCell[][];
}

interface GoogleBatchGetValuesResponse {
  spreadsheetId?: string;
  valueRanges?: GoogleValueRangeResponse[];
}

function matchesExpectedRemote(
  current: RemoteSyncRecord | undefined,
  mutation: SyncMutation,
): boolean {
  if (!current) {
    return (
      mutation.expectedRevision === null && mutation.expectedMutationId === null
    );
  }

  return (
    current.revision === mutation.expectedRevision &&
    current.mutationId === mutation.expectedMutationId
  );
}

@Injectable({
  providedIn: "root",
})
export class GoogleSheetsClient {
  async createLootrackSpreadsheet(
    accessToken: string,
  ): Promise<CreatedGoogleSpreadsheet> {
    const spreadsheet = await this.request<GoogleSpreadsheetResponse>(
      SHEETS_API_BASE_URL,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          properties: {
            title: "Lootrack",
          },
          sheets: [
            {
              properties: {
                title: TRANSACTIONS_SHEET,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              data: [
                {
                  startRow: 0,
                  startColumn: 0,
                  rowData: [
                    {
                      values: TRANSACTION_HEADERS.map((header) => ({
                        userEnteredValue: {
                          stringValue: header,
                        },
                      })),
                    },
                  ],
                },
              ],
            },
            {
              properties: {
                title: CATEGORIES_SHEET,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              data: [
                {
                  startRow: 0,
                  startColumn: 0,
                  rowData: [
                    {
                      values: CATEGORY_HEADERS.map((header) => ({
                        userEnteredValue: {
                          stringValue: header,
                        },
                      })),
                    },
                  ],
                },
              ],
            },
            {
              properties: {
                title: META_SHEET,
                hidden: true,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              data: [
                {
                  startRow: 0,
                  startColumn: 0,
                  rowData: META_VALUES.map((row) => ({
                    values: row.map((value) => ({
                      userEnteredValue: {
                        stringValue: value,
                      },
                    })),
                  })),
                },
              ],
            },
          ],
        }),
      },
    );

    if (!spreadsheet.spreadsheetId) {
      throw new Error(
        "Google created the spreadsheet without returning its ID",
      );
    }

    return {
      spreadsheetId: spreadsheet.spreadsheetId,
    };
  }

  async validateLootrackSpreadsheet(
    accessToken: string,
    spreadsheetId: string,
  ): Promise<void> {
    const fields = encodeURIComponent(
      "spreadsheetId,sheets.properties(title,hidden)",
    );

    const spreadsheet = await this.request<GoogleSpreadsheetResponse>(
      `${SHEETS_API_BASE_URL}/${encodeURIComponent(
        spreadsheetId,
      )}?fields=${fields}`,
      accessToken,
    );

    const sheetNames = new Set(
      spreadsheet.sheets
        ?.map((sheet) => sheet.properties?.title)
        .filter((title): title is string => title !== undefined) ?? [],
    );

    const missingSheets = [
      TRANSACTIONS_SHEET,
      CATEGORIES_SHEET,
      META_SHEET,
    ].filter((sheetName) => !sheetNames.has(sheetName));

    if (missingSheets.length > 0) {
      throw new Error(
        `The selected spreadsheet is not a valid Lootrack store. Missing sheets: ${missingSheets.join(
          ", ",
        )}`,
      );
    }

    const metaResponse = await this.request<{
      values?: string[][];
    }>(
      `${SHEETS_API_BASE_URL}/${encodeURIComponent(
        spreadsheetId,
      )}/values/${encodeURIComponent(`${META_SHEET}!A1:B3`)}`,
      accessToken,
    );

    const metadata = new Map(
      (metaResponse.values ?? []).slice(1).map(([key, value]) => [key, value]),
    );

    if (metadata.get("appId") !== "lootrack") {
      throw new Error("The selected spreadsheet does not belong to Lootrack");
    }

    if (metadata.get("schemaVersion") !== "1") {
      throw new Error(
        `Unsupported Lootrack spreadsheet schema: ${
          metadata.get("schemaVersion") ?? "unknown"
        }`,
      );
    }
  }

  async pushLootrackMutations(
    accessToken: string,
    spreadsheetId: string,
    request: SyncPushRequest,
  ): Promise<SyncPushResult> {
    if (request.mutations.length === 0) {
      return {
        records: [],
      };
    }

    /*
     * Read again immediately before writing.
     *
     * The original snapshot used by the reconciler may already be stale by
     * the time this method is called.
     */
    const snapshot = await this.readLootrackSnapshot(
      accessToken,
      spreadsheetId,
    );

    const recordsByKey = new Map(
      snapshot.records.map((record) => [
        this.recordKey(record.entityType, record.entityId),
        record,
      ]),
    );

    /*
     * Contains only the final version of each entity affected by this push.
     */
    const affectedRecordsByKey = new Map<string, RemoteSyncRecord>();

    /*
     * Mutations must be processed in order.
     *
     * A later mutation for the same entity expects the result produced by the
     * previous mutation in the chain.
     */
    for (const mutation of request.mutations) {
      const key = this.recordKey(mutation.entityType, mutation.entityId);

      const currentRecord = recordsByKey.get(key);

      /*
       * Idempotency:
       *
       * The previous request may have reached Google Sheets even though the
       * client never received its response.
       */
      if (currentRecord?.mutationId === mutation.mutationId) {
        affectedRecordsByKey.set(key, currentRecord);

        continue;
      }

      if (!matchesExpectedRemote(currentRecord, mutation)) {
        throw new GoogleSheetsWriteConflictError(
          mutation.entityType,
          mutation.entityId,
        );
      }

      const nextRecord = this.recordFromMutation(mutation);

      recordsByKey.set(key, nextRecord);

      affectedRecordsByKey.set(key, nextRecord);
    }

    const transactionRecords = [...recordsByKey.values()]
      .filter(
        (
          record,
        ): record is RemoteSyncRecord & {
          entityType: "transaction";
        } => record.entityType === "transaction",
      )
      .sort((left, right) => left.entityId.localeCompare(right.entityId));

    const categoryRecords = [...recordsByKey.values()]
      .filter(
        (
          record,
        ): record is RemoteSyncRecord & {
          entityType: "category";
        } => record.entityType === "category",
      )
      .sort((left, right) => left.entityId.localeCompare(right.entityId));

    const transactionValues =
      this.buildTransactionSheetValues(transactionRecords);

    const categoryValues = this.buildCategorySheetValues(categoryRecords);

    await this.request<unknown>(
      `${SHEETS_API_BASE_URL}/${encodeURIComponent(
        spreadsheetId,
      )}/values:batchUpdate`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          valueInputOption: "RAW",
          includeValuesInResponse: false,
          data: [
            {
              range: `${TRANSACTIONS_SHEET}!A1:K` + transactionValues.length,
              majorDimension: "ROWS",
              values: transactionValues,
            },
            {
              range: `${CATEGORIES_SHEET}!A1:H` + categoryValues.length,
              majorDimension: "ROWS",
              values: categoryValues,
            },
          ],
        }),
      },
    );

    return {
      records: [...affectedRecordsByKey.values()],
    };
  }

  private recordFromMutation(mutation: SyncMutation): RemoteSyncRecord {
    const context = `${mutation.entityType} mutation ` + mutation.mutationId;

    const entity =
      mutation.entityType === "transaction"
        ? this.parseTransactionPayload(mutation.payloadJson, context)
        : this.parseCategoryPayload(mutation.payloadJson, context);

    if (entity.id !== mutation.entityId) {
      throw new GoogleSheetsDataError(
        `${context}: payload entity ID does not match the mutation`,
      );
    }

    if (entity.lastMutationId !== mutation.mutationId) {
      throw new GoogleSheetsDataError(
        `${context}: payload lastMutationId does not match the mutation`,
      );
    }

    const expectedNextRevision = (mutation.expectedRevision ?? 0) + 1;

    if (entity.revision !== expectedNextRevision) {
      throw new GoogleSheetsDataError(
        `${context}: expected payload revision ${expectedNextRevision}, ` +
          `received ${entity.revision ?? "null"}`,
      );
    }

    const record = this.toRemoteRecord(mutation.entityType, entity);

    if (record.operation !== mutation.operation) {
      throw new GoogleSheetsDataError(
        `${context}: payload deletion state does not match the mutation operation`,
      );
    }

    return record;
  }

  private buildTransactionSheetValues(
    records: readonly RemoteSyncRecord[],
  ): GoogleSheetCell[][] {
    const rows = records.map((record): GoogleSheetCell[] => {
      const transaction = this.parseTransactionPayload(
        record.payloadJson,
        `remote transaction ${record.entityId}`,
      );

      this.assertRecordMatchesEntity(record, transaction);

      return [
        transaction.id,
        transaction.type,
        transaction.amountInCents,
        transaction.description,
        transaction.occurredOn,
        transaction.categoryId ?? "",
        transaction.createdAt,
        transaction.updatedAt,
        transaction.deletedAt ?? "",
        transaction.revision as number,
        transaction.lastMutationId as string,
      ];
    });
    return [[...TRANSACTION_HEADERS], ...rows];
  }

  private buildCategorySheetValues(
    records: readonly RemoteSyncRecord[],
  ): GoogleSheetCell[][] {
    const rows = records.map((record): GoogleSheetCell[] => {
      const category = this.parseCategoryPayload(
        record.payloadJson,
        `remote category ${record.entityId}`,
      );

      this.assertRecordMatchesEntity(record, category);

      return [
        category.id,
        category.type,
        category.name,
        category.createdAt,
        category.updatedAt,
        category.deletedAt ?? "",
        category.revision as number,
        category.lastMutationId as string,
      ];
    });

    return [[...CATEGORY_HEADERS], ...rows];
  }

  private parseTransactionPayload(
    payloadJson: string,
    context: string,
  ): Transaction {
    const value = this.parsePayloadObject(payloadJson, context);

    this.assertCommonEntityPayload(value, context);

    if (value["type"] !== "expense" && value["type"] !== "income") {
      throw new GoogleSheetsDataError(`${context}: invalid transaction type`);
    }

    if (
      typeof value["amountInCents"] !== "number" ||
      !Number.isSafeInteger(value["amountInCents"]) ||
      value["amountInCents"] < 0
    ) {
      throw new GoogleSheetsDataError(`${context}: invalid amountInCents`);
    }

    if (typeof value["description"] !== "string") {
      throw new GoogleSheetsDataError(`${context}: invalid description`);
    }

    if (
      typeof value["occurredOn"] !== "string" ||
      value["occurredOn"].length === 0
    ) {
      throw new GoogleSheetsDataError(`${context}: invalid occurredOn`);
    }

    if (
      value["categoryId"] !== null &&
      typeof value["categoryId"] !== "string"
    ) {
      throw new GoogleSheetsDataError(`${context}: invalid categoryId`);
    }

    return value as unknown as Transaction;
  }

  private parseCategoryPayload(payloadJson: string, context: string): Category {
    const value = this.parsePayloadObject(payloadJson, context);

    this.assertCommonEntityPayload(value, context);

    if (value["type"] !== "expense" && value["type"] !== "income") {
      throw new GoogleSheetsDataError(`${context}: invalid category type`);
    }

    if (
      typeof value["name"] !== "string" ||
      value["name"].trim().length === 0
    ) {
      throw new GoogleSheetsDataError(`${context}: invalid category name`);
    }

    return value as unknown as Category;
  }

  private parsePayloadObject(
    payloadJson: string,
    context: string,
  ): Record<string, unknown> {
    let value: unknown;

    try {
      value = JSON.parse(payloadJson);
    } catch {
      throw new GoogleSheetsDataError(`${context}: payload is not valid JSON`);
    }

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new GoogleSheetsDataError(`${context}: payload must be an object`);
    }

    return value as Record<string, unknown>;
  }

  private assertCommonEntityPayload(
    entity: Record<string, unknown>,
    context: string,
  ): void {
    for (const field of [
      "id",
      "createdAt",
      "updatedAt",
      "lastMutationId",
    ] as const) {
      if (typeof entity[field] !== "string" || entity[field].length === 0) {
        throw new GoogleSheetsDataError(`${context}: invalid ${field}`);
      }
    }

    if (
      entity["deletedAt"] !== null &&
      typeof entity["deletedAt"] !== "string"
    ) {
      throw new GoogleSheetsDataError(`${context}: invalid deletedAt`);
    }

    if (
      typeof entity["revision"] !== "number" ||
      !Number.isSafeInteger(entity["revision"]) ||
      entity["revision"] < 1
    ) {
      throw new GoogleSheetsDataError(`${context}: invalid revision`);
    }
  }

  private assertRecordMatchesEntity(
    record: RemoteSyncRecord,
    entity: Transaction | Category,
  ): void {
    if (
      entity.id !== record.entityId ||
      entity.revision !== record.revision ||
      entity.lastMutationId !== record.mutationId
    ) {
      throw new GoogleSheetsDataError(
        `Remote ${record.entityType} ${record.entityId} has inconsistent metadata`,
      );
    }

    const operation = entity.deletedAt === null ? "upsert" : "delete";

    if (operation !== record.operation) {
      throw new GoogleSheetsDataError(
        `Remote ${record.entityType} ${record.entityId} has an inconsistent operation`,
      );
    }
  }

  private recordKey(
    entityType: RemoteSyncRecord["entityType"],
    entityId: string,
  ): string {
    return `${entityType}:${entityId}`;
  }

  private async request<T>(
    url: string,
    accessToken: string,
    init: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      const error = await this.readError(response);

      throw new GoogleApiError(
        error.error?.message ??
          `Google Sheets request failed with status ${response.status}`,
        response.status,
        error.error?.status ?? null,
      );
    }

    return (await response.json()) as T;
  }

  private async readError(response: Response): Promise<GoogleApiErrorResponse> {
    try {
      return (await response.json()) as GoogleApiErrorResponse;
    } catch {
      return {};
    }
  }

  async readLootrackSnapshot(
    accessToken: string,
    spreadsheetId: string,
  ): Promise<RemoteSyncSnapshot> {
    const url = new URL(
      `${SHEETS_API_BASE_URL}/${encodeURIComponent(
        spreadsheetId,
      )}/values:batchGet`,
    );

    url.searchParams.append("ranges", `${TRANSACTIONS_SHEET}!A1:K`);
    url.searchParams.append("ranges", `${CATEGORIES_SHEET}!A1:H`);
    url.searchParams.set("majorDimension", "ROWS");
    url.searchParams.set("valueRenderOption", "UNFORMATTED_VALUE");

    const response = await this.request<GoogleBatchGetValuesResponse>(
      url.toString(),
      accessToken,
    );

    const [transactionsRange, categoriesRange] = response.valueRanges ?? [];

    const transactionValues = transactionsRange?.values ?? [];
    const categoryValues = categoriesRange?.values ?? [];

    this.assertHeaders(
      transactionValues[0],
      TRANSACTION_HEADERS,
      TRANSACTIONS_SHEET,
    );

    this.assertHeaders(categoryValues[0], CATEGORY_HEADERS, CATEGORIES_SHEET);

    const records = [
      ...this.parseTransactionRows(transactionValues.slice(1)),
      ...this.parseCategoryRows(categoryValues.slice(1)),
    ];

    this.assertUniqueRecords(records);

    return { records };
  }
  private parseTransactionRows(
    rows: readonly (readonly GoogleSheetCell[])[],
  ): RemoteSyncRecord[] {
    return rows.flatMap((row, index) => {
      if (this.isBlankRow(row)) {
        return [];
      }

      const rowNumber = index + 2;
      const context = `${TRANSACTIONS_SHEET} row ${rowNumber}`;

      const type = this.readTransactionType(row, 1, context);

      const transaction: Transaction = {
        id: this.readRequiredString(row, 0, context, "id"),
        type,
        amountInCents: this.readInteger(row, 2, context, "amountInCents", 0),
        description: this.readStringOrEmpty(row, 3, context, "description"),
        occurredOn: this.readRequiredString(row, 4, context, "occurredOn"),
        categoryId: this.readNullableString(row, 5, context, "categoryId"),
        createdAt: this.readRequiredString(row, 6, context, "createdAt"),
        updatedAt: this.readRequiredString(row, 7, context, "updatedAt"),
        deletedAt: this.readNullableString(row, 8, context, "deletedAt"),
        revision: this.readInteger(row, 9, context, "revision", 1),
        lastMutationId: this.readRequiredString(
          row,
          10,
          context,
          "lastMutationId",
        ),
      };

      return [this.toRemoteRecord("transaction", transaction)];
    });
  }

  private parseCategoryRows(
    rows: readonly (readonly GoogleSheetCell[])[],
  ): RemoteSyncRecord[] {
    return rows.flatMap((row, index) => {
      if (this.isBlankRow(row)) {
        return [];
      }

      const rowNumber = index + 2;
      const context = `${CATEGORIES_SHEET} row ${rowNumber}`;

      const category: Category = {
        id: this.readRequiredString(row, 0, context, "id"),
        type: this.readTransactionType(row, 1, context),
        name: this.readRequiredString(row, 2, context, "name"),
        createdAt: this.readRequiredString(row, 3, context, "createdAt"),
        updatedAt: this.readRequiredString(row, 4, context, "updatedAt"),
        deletedAt: this.readNullableString(row, 5, context, "deletedAt"),
        revision: this.readInteger(row, 6, context, "revision", 1),
        lastMutationId: this.readRequiredString(
          row,
          7,
          context,
          "lastMutationId",
        ),
      };

      return [this.toRemoteRecord("category", category)];
    });
  }

  private toRemoteRecord(
    entityType: RemoteSyncRecord["entityType"],
    entity: Transaction | Category,
  ): RemoteSyncRecord {
    if (entity.revision === null || entity.lastMutationId === null) {
      throw new GoogleSheetsDataError(
        `${entityType} ${entity.id} has incomplete synchronization metadata`,
      );
    }

    return {
      entityType,
      entityId: entity.id,
      operation: entity.deletedAt === null ? "upsert" : "delete",
      revision: entity.revision,
      mutationId: entity.lastMutationId,
      payloadJson: JSON.stringify(entity),
    };
  }

  private assertHeaders(
    actual: readonly GoogleSheetCell[] | undefined,
    expected: readonly string[],
    sheetName: string,
  ): void {
    const headersMatch =
      actual?.length === expected.length &&
      expected.every((header, index) => actual[index] === header);

    if (!headersMatch) {
      throw new GoogleSheetsDataError(
        `${sheetName} has an invalid or unsupported header`,
      );
    }
  }

  private assertUniqueRecords(records: readonly RemoteSyncRecord[]): void {
    const found = new Set<string>();

    for (const record of records) {
      const key = `${record.entityType}:${record.entityId}`;

      if (found.has(key)) {
        throw new GoogleSheetsDataError(
          `Duplicate remote entity found: ${key}`,
        );
      }

      found.add(key);
    }
  }

  private isBlankRow(row: readonly GoogleSheetCell[]): boolean {
    return row.length === 0 || row.every((value) => value === "");
  }

  private readRequiredString(
    row: readonly GoogleSheetCell[],
    index: number,
    context: string,
    field: string,
  ): string {
    const value = row[index];

    if (typeof value !== "string" || value.trim().length === 0) {
      throw new GoogleSheetsDataError(
        `${context}: ${field} must be a non-empty string`,
      );
    }

    return value;
  }

  private readStringOrEmpty(
    row: readonly GoogleSheetCell[],
    index: number,
    context: string,
    field: string,
  ): string {
    const value = row[index];

    if (value === undefined || value === "") {
      return "";
    }

    if (typeof value !== "string") {
      throw new GoogleSheetsDataError(`${context}: ${field} must be a string`);
    }

    return value;
  }

  private readNullableString(
    row: readonly GoogleSheetCell[],
    index: number,
    context: string,
    field: string,
  ): string | null {
    const value = row[index];

    if (value === undefined || value === "") {
      return null;
    }

    if (typeof value !== "string") {
      throw new GoogleSheetsDataError(
        `${context}: ${field} must be a string or empty`,
      );
    }

    return value;
  }

  private readInteger(
    row: readonly GoogleSheetCell[],
    index: number,
    context: string,
    field: string,
    minimum: number,
  ): number {
    const value = row[index];

    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < minimum
    ) {
      throw new GoogleSheetsDataError(
        `${context}: ${field} must be an integer greater than or equal to ${minimum}`,
      );
    }

    return value;
  }

  private readTransactionType(
    row: readonly GoogleSheetCell[],
    index: number,
    context: string,
  ): TransactionType {
    const value = this.readRequiredString(row, index, context, "type");

    if (value !== "expense" && value !== "income") {
      throw new GoogleSheetsDataError(
        `${context}: unsupported transaction type "${value}"`,
      );
    }

    return value;
  }
}

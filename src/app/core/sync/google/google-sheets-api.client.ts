import { Injectable } from "@angular/core";
import { GoogleApiError } from "./google-sheets.errors";

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

@Injectable({
  providedIn: "root",
})
export class GoogleSheetsApiClient {
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
}

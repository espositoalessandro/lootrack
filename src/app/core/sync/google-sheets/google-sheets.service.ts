import { inject, Injectable } from "@angular/core";
import { firstValueFrom, map, Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import { SyncTarget } from "../../models/models";
import { GoogleSheetsClient } from "./google-sheets.client";
import { GoogleApiError } from "./google-sheets.errors";
import { PERSISTENCE_PROVIDER } from "../../persistence/providers/provider.models";

@Injectable({
  providedIn: "root",
})
export class GoogleSheetsService {
  private readonly persistenceProvider = inject(PERSISTENCE_PROVIDER);
  private readonly sheetsApi = inject(GoogleSheetsClient);

  async ensureTarget(accessToken: string): Promise<SyncTarget> {
    const configuredTarget = this.getConfiguredTarget();

    if (configuredTarget) {
      await this.sheetsApi.validateLootrackSpreadsheet(
        accessToken,
        configuredTarget.remoteId,
      );

      return configuredTarget;
    }

    const existingTarget = await firstValueFrom(this.getStoredTarget());

    if (existingTarget) {
      try {
        await this.sheetsApi.validateLootrackSpreadsheet(
          accessToken,
          existingTarget.remoteId,
        );

        return existingTarget;
      } catch (error: unknown) {
        if (!this.shouldReplaceTarget(error)) {
          throw error;
        }

        await firstValueFrom(this.clearTarget());
      }
    }

    const created = await this.sheetsApi.createLootrackSpreadsheet(accessToken);

    return await firstValueFrom(this.saveTarget(created.spreadsheetId));
  }

  async requireTarget(): Promise<SyncTarget> {
    const configuredTarget = this.getConfiguredTarget();

    if (configuredTarget) {
      return configuredTarget;
    }

    const target = await firstValueFrom(this.getStoredTarget());

    if (!target) {
      throw new Error("Google Sheets synchronization target is not configured");
    }

    return target;
  }

  private getConfiguredTarget(): SyncTarget | null {
    const remoteId = environment.googleSheets.targetSpreadsheetId;
    if (!remoteId) {
      return null;
    }
    return {
      id: "active",
      remoteId,
    };
  }

  private shouldReplaceTarget(error: unknown): boolean {
    return error instanceof GoogleApiError && error.status === 404;
  }

  private getStoredTarget(): Observable<SyncTarget | null> {
    return this.persistenceProvider.syncTargets
      .get("active")
      .pipe(map((target) => target ?? null));
  }

  private saveTarget(remoteId: string): Observable<SyncTarget> {
    const target: SyncTarget = {
      id: "active",
      remoteId,
    };

    return this.persistenceProvider.syncTargets
      .put(target)
      .pipe(map(() => target));
  }

  private clearTarget(): Observable<void> {
    return this.persistenceProvider.syncTargets.delete("active");
  }
}

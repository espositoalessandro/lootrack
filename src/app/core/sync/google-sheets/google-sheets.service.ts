import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { SyncTargetRepository } from "../../data/repositories/sync-target-repository";
import { SyncTarget } from "../../data/models";
import { GoogleSheetsClient } from "./google-sheets.client";
import { GoogleApiError } from "./google-sheets.errors";

@Injectable({
  providedIn: "root",
})
export class GoogleSheetsService {
  private readonly targetRepository = inject(SyncTargetRepository);
  private readonly sheetsApi = inject(GoogleSheetsClient);

  async ensureTarget(accessToken: string): Promise<SyncTarget> {
    const existingTarget = await firstValueFrom(this.targetRepository.get());

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

        await firstValueFrom(this.targetRepository.clear());
      }
    }

    const created = await this.sheetsApi.createLootrackSpreadsheet(accessToken);

    return await firstValueFrom(
      this.targetRepository.save(created.spreadsheetId),
    );
  }

  private shouldReplaceTarget(error: unknown): boolean {
    return error instanceof GoogleApiError && error.status === 404;
  }

  async requireTarget(): Promise<SyncTarget> {
    const target = await firstValueFrom(this.targetRepository.get());

    if (!target) {
      throw new Error("Google Sheets synchronization target is not configured");
    }

    return target;
  }
}

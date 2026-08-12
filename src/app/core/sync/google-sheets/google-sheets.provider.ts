import { inject, Injectable } from "@angular/core";

import { GoogleAuthorizationService } from "./google-authorization.service";
import { GoogleSheetsService } from "./google-sheets.service";
import {
  RemoteSyncSnapshot,
  SyncProvider,
  SyncPushRequest,
  SyncPushResult,
} from "../../models/models";
import { GoogleSheetsClient } from "./google-sheets.client";

@Injectable()
export class GoogleSheetsProvider implements SyncProvider {
  private readonly authorization = inject(GoogleAuthorizationService);
  private readonly targetService = inject(GoogleSheetsService);
  private readonly sheetsApi = inject(GoogleSheetsClient);

  async initialize(): Promise<void> {
    await this.authorization.loadLibrary();
  }

  async connect(): Promise<void> {
    const accessToken = await this.authorization.getAccessToken();
    await this.targetService.ensureTarget(accessToken);
  }

  async pull(): Promise<RemoteSyncSnapshot> {
    const accessToken = await this.authorization.getAccessToken();
    const target = await this.targetService.requireTarget();

    return await this.sheetsApi.readLootrackSnapshot(
      accessToken,
      target.remoteId,
    );
  }

  async push(request: SyncPushRequest): Promise<SyncPushResult> {
    const accessToken = await this.authorization.getAccessToken();

    const target = await this.targetService.requireTarget();

    return this.sheetsApi.pushLootrackMutations(
      accessToken,
      target.remoteId,
      request,
    );
  }

  async disconnect(): Promise<void> {
    this.authorization.clearAccessToken();
  }

  isConnected(): boolean {
    return this.authorization.hasValidAccessToken();
  }
}

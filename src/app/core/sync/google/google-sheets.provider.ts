import { inject, Injectable } from "@angular/core";

import { GoogleAuthorizationService } from "./google-authorization.service";
import { GoogleSheetsTargetService } from "./google-sheets-target.service";
import {
  RemoteSyncSnapshot,
  SyncProvider,
  SyncPushRequest,
  SyncPushResult,
} from "../../data/models";

@Injectable()
export class GoogleSheetsProvider implements SyncProvider {
  private readonly authorization = inject(GoogleAuthorizationService);
  private readonly targetService = inject(GoogleSheetsTargetService);

  async initialize(): Promise<void> {
    await this.authorization.loadLibrary();
  }

  async connect(): Promise<void> {
    const accessToken = await this.authorization.getAccessToken();
    await this.targetService.ensureTarget(accessToken);
  }

  async pull(): Promise<RemoteSyncSnapshot> {
    throw new Error("Google Sheets pull is not implemented yet");
  }

  async push(_request: SyncPushRequest): Promise<SyncPushResult> {
    throw new Error("Google Sheets push is not implemented yet");
  }

  async disconnect(): Promise<void> {
    this.authorization.clearAccessToken();
  }

  isConnected(): boolean {
    return this.authorization.hasValidAccessToken();
  }
}

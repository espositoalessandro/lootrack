import { inject, Injectable } from "@angular/core";
import { GoogleAuthorizationService } from "./google-authorization.service";
import {
  RemoteSyncSnapshot,
  SyncProvider,
  SyncPushRequest,
  SyncPushResult,
} from "../../data/models";

@Injectable()
export class GoogleSheetsSyncProvider implements SyncProvider {
  private readonly authorization: GoogleAuthorizationService = inject(
    GoogleAuthorizationService,
  );

  async initialize(): Promise<void> {
    await this.authorization.loadLibrary();
  }

  async connect(): Promise<void> {
    await this.authorization.getAccessToken();
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

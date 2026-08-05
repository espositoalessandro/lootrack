import { inject, Injectable } from "@angular/core";

import { GoogleAuthorizationService } from "./google-authorization.service";
import {
  SyncExchangeRequest,
  SyncExchangeResult,
  SyncProvider,
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

  async exchange(_request: SyncExchangeRequest): Promise<SyncExchangeResult> {
    throw new Error("Google Sheets synchronization is not implemented yet");
  }

  async disconnect(): Promise<void> {
    this.authorization.clearAccessToken();
  }
}

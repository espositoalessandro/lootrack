import { AppSettings, SyncProvider } from "./models";
import { InjectionToken } from "@angular/core";

export const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  currency: "EUR",
  locale: "en",
  theme: "dark",
  language: "en",
};
export const SYNC_PROVIDER = new InjectionToken<SyncProvider>("SYNC_PROVIDER");

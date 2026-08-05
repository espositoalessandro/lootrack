import { createFeatureSelector, createSelector } from "@ngrx/store";
import { SyncState } from "./sync.reducer";

export const selectSyncState = createFeatureSelector<SyncState>("sync");

export const selectSyncConnectionStatus = createSelector(
  selectSyncState,
  (state) => state.connectionStatus,
);

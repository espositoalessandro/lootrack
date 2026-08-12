import { createFeatureSelector, createSelector } from "@ngrx/store";
import { SyncState } from "./sync.reducer";

export const selectSyncState = createFeatureSelector<SyncState>("sync");

export const selectSyncConnectionStatus = createSelector(
  selectSyncState,
  (state) => state.connectionStatus,
);

export const selectPendingChanges = createSelector(
  selectSyncState,
  (state) => state.pendingChanges,
);

export const selectHasPendingChanges = createSelector(
  selectPendingChanges,
  (changes) => changes.length > 0,
);

export const selectPendingEntityCount = createSelector(
  selectPendingChanges,
  (changes) => changes.length,
);

export const selectPendingMutationCount = createSelector(
  selectPendingChanges,
  (changes) =>
    changes.reduce((count, entity) => count + entity.changes.length, 0),
);

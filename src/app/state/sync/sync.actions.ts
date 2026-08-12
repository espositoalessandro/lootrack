import { createAction, props } from "@ngrx/store";
import {
  PendingEntityChanges,
  SyncConflictCandidate,
} from "../../core/models/models";

export const connectSync = createAction("[Sync] Connect Requested");

export const connectSyncSuccess = createAction(
  "[Sync Provider] Connect Succeeded",
);

export const connectSyncFailure = createAction(
  "[Sync Provider] Connect Failed",
  props<{ error: string }>(),
);

export const synchronize = createAction("[Sync] Synchronization Requested");

export const synchronizeSuccess = createAction(
  "[Sync] Synchronization Succeeded",
);

export const synchronizeFailure = createAction(
  "[Sync] Synchronization Failed",
  props<{ error: string }>(),
);

export const synchronizeConnectionRequired = createAction(
  "[Sync] Connection Required",
);

export const synchronizeConflictFailure = createAction(
  "[Sync] Synchronization Failed With Conflicts",

  props<{
    conflicts: readonly SyncConflictCandidate[];
  }>(),
);

export const loadPendingChanges = createAction(
  "[Sync] Pending Changes Load Requested",
);

export const loadPendingChangesSuccess = createAction(
  "[Sync] Pending Changes Load Succeeded",
  props<{
    pendingChanges: readonly PendingEntityChanges[];
  }>(),
);

export const loadPendingChangesFailure = createAction(
  "[Sync] Pending Changes Load Failed",
  props<{ error: string }>(),
);

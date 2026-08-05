import { createAction, props } from "@ngrx/store";

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

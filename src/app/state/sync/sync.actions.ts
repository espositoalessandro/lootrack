import { createAction, props } from "@ngrx/store";

export const connectSync = createAction("[Sync] Connect Requested");

export const connectSyncSuccess = createAction(
  "[Sync Provider] Connect Succeeded",
);

export const connectSyncFailure = createAction(
  "[Sync Provider] Connect Failed",
  props<{ error: string }>(),
);

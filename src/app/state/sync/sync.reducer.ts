import { createReducer, on } from "@ngrx/store";
import {
  connectSync,
  connectSyncFailure,
  connectSyncSuccess,
} from "./sync.actions";

export type SyncConnectionStatus = "disconnected" | "connecting" | "connected";

export interface SyncState {
  connectionStatus: SyncConnectionStatus;
  error: string | null;
}

export const initialSyncState: SyncState = {
  connectionStatus: "disconnected",
  error: null,
};

export const syncReducer = createReducer(
  initialSyncState,

  on(connectSync, (state) => ({
    ...state,
    connectionStatus: "connecting" as const,
    error: null,
  })),

  on(connectSyncSuccess, (state) => ({
    ...state,
    connectionStatus: "connected" as const,
    error: null,
  })),

  on(connectSyncFailure, (state, { error }) => ({
    ...state,
    connectionStatus: "disconnected" as const,
    error,
  })),
);

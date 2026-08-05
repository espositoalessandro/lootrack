import { createReducer, on } from "@ngrx/store";
import {
  connectSync,
  connectSyncFailure,
  connectSyncSuccess,
  synchronize,
  synchronizeFailure,
  synchronizeSuccess,
} from "./sync.actions";

export type SyncConnectionStatus = "disconnected" | "connecting" | "connected";

export interface SyncState {
  connectionStatus: SyncConnectionStatus;
  synchronizing: boolean;
  error: string | null;
}

export const initialSyncState: SyncState = {
  connectionStatus: "disconnected",
  synchronizing: false,
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

  on(synchronize, (state) => ({
    ...state,
    synchronizing: true,
    error: null,
  })),

  on(synchronizeSuccess, (state) => ({
    ...state,
    connectionStatus: "connected" as const,
    synchronizing: false,
    error: null,
  })),

  on(synchronizeFailure, (state, { error }) => ({
    ...state,
    connectionStatus: "disconnected" as const,
    synchronizing: false,
    error,
  })),
);

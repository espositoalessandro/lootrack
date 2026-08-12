import { createReducer, on } from "@ngrx/store";
import {
  connectSync,
  connectSyncFailure,
  connectSyncSuccess,
  synchronize,
  synchronizeConflictFailure,
  synchronizeConnectionRequired,
  synchronizeFailure,
  synchronizeSuccess,
} from "./sync.actions";
import { SyncConflictCandidate } from "../../core/models/models";

export type SyncConnectionStatus = "disconnected" | "connecting" | "connected";

export interface SyncState {
  connectionStatus: SyncConnectionStatus;
  synchronizing: boolean;
  error: string | null;
  conflicts: readonly SyncConflictCandidate[];
}

export const initialSyncState: SyncState = {
  connectionStatus: "disconnected",
  synchronizing: false,
  error: null,
  conflicts: [],
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
    conflicts: [],
  })),

  on(synchronizeSuccess, (state) => ({
    ...state,
    connectionStatus: "connected" as const,
    synchronizing: false,
    error: null,
    conflicts: [],
  })),

  on(synchronizeConflictFailure, (state, { conflicts }) => ({
    ...state,
    connectionStatus: "connected" as const,
    synchronizing: false,
    error:
      conflicts.length === 1
        ? "Synchronization cancelled because a conflict was found"
        : `Synchronization cancelled because ${conflicts.length} conflicts were found`,
    conflicts,
  })),

  on(synchronizeFailure, (state, { error }) => ({
    ...state,
    synchronizing: false,
    error,
    conflicts: [],
  })),

  on(synchronizeConnectionRequired, (state) => ({
    ...state,
    connectionStatus: "disconnected" as const,
    synchronizing: false,
    error: null,
  })),
);

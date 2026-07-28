import { AppSettings } from "../../data/models";
import { createReducer, on } from "@ngrx/store";
import {
  createSettingsDefaults,
  createSettingsDefaultsFailure,
  createSettingsDefaultsSuccess,
  loadAppSettings,
  loadAppSettingsFailure,
  loadAppSettingsSuccess,
  updateAppSettings,
  updateAppSettingsFailure,
  updateAppSettingsSuccess,
} from "./app-settings.actions";
import { DEFAULT_SETTINGS } from "../../data/CONST";

export interface AppSettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
}

export const initialAppSettingsState: AppSettingsState = {
  settings: DEFAULT_SETTINGS,
  loading: false,
  error: null,
};

export const appSettingsReducer = createReducer(
  initialAppSettingsState,

  on(loadAppSettings, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(loadAppSettingsSuccess, (state, { settings }) => ({
    ...state,
    settings: { ...settings },
    loading: false,
    error: null,
  })),

  on(loadAppSettingsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(createSettingsDefaults, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(createSettingsDefaultsSuccess, (state, { settings }) => ({
    ...state,
    settings: { ...settings },
    loading: false,
    error: null,
  })),

  on(createSettingsDefaultsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(updateAppSettings, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(updateAppSettingsSuccess, (state, { settings }) => ({
    ...state,
    settings: { ...state.settings, ...settings },
    loading: false,
    error: null,
  })),

  on(updateAppSettingsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error: error,
  })),
);

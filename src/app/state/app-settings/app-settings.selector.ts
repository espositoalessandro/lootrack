import { createFeatureSelector, createSelector } from "@ngrx/store";
import { AppSettingsState } from "./app-settings.reducer";

export const selectAppSettingsState =
  createFeatureSelector<AppSettingsState>("appSettings");

export const selectAppSettings = createSelector(
  selectAppSettingsState,
  (state) => state.settings,
);

export const selectAppSettingsLoading = createSelector(
  selectAppSettingsState,
  (state) => state.loading,
);

export const selectAppSettingsError = createSelector(
  selectAppSettingsState,
  (state) => state.error,
);

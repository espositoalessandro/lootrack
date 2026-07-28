import { createAction, props } from "@ngrx/store";
import { AppSettings } from "../../data/models";

// RETRIEVES

export const loadAppSettings = createAction(
  "[AppSettings Database] Load Requested",
);

export const loadAppSettingsSuccess = createAction(
  "[AppSettings Database] Load Succeeded",
  props<{ settings: AppSettings }>(),
);

export const loadAppSettingsFailure = createAction(
  "[AppSettings Database] Load Failed",
  props<{ error: string }>(),
);

// UPDATES

export const updateAppSettings = createAction(
  "[AppSettings Database] Update Requested",
  props<{ newSettings: Partial<AppSettings> }>(),
);

export const updateAppSettingsSuccess = createAction(
  "[AppSettings Database] Update Succeeded",
  props<{ settings: AppSettings }>(),
);

export const updateAppSettingsFailure = createAction(
  "[AppSettings Database] Update Failed",
  props<{ error: string }>(),
);

// CREATE DEFAULTS

export const createSettingsDefaults = createAction(
  "[AppSettings Database] Create Defaults Requested",
);

export const createSettingsDefaultsSuccess = createAction(
  "[AppSettings Database] Create Defaults Succeeded",
  props<{ settings: AppSettings }>(),
);

export const createSettingsDefaultsFailure = createAction(
  "[AppSettings Database] Create Defaults Failed",
  props<{ error: string }>(),
);

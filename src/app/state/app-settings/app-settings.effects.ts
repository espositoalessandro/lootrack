import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { AppSettingsRepository } from "../../data/repositories/app-settings-repository";
import {
  catchError,
  concatMap,
  EMPTY,
  exhaustMap,
  map,
  of,
  switchMap,
} from "rxjs";
import {
  createSettingsDefaults,
  createSettingsDefaultsSuccess,
  generalAppSettingsFailure,
  loadAppSettings,
  loadAppSettingsSuccess,
  updateAppSettings,
  updateAppSettingsSuccess,
} from "./app-settings.actions";
import { TuiDialogService } from "@taiga-ui/core";
import { DEFAULT_SETTINGS } from "../../data/CONST";
import { AppSettingsNotFoundError } from "../../data/errors";

@Injectable()
export class AppSettingsEffects {
  private readonly actions$ = inject(Actions);
  private readonly dialogs = inject(TuiDialogService);
  private readonly appSettingsDatabase = inject(AppSettingsRepository);

  readonly loadAppSettings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadAppSettings),
      switchMap(() =>
        this.appSettingsDatabase.get().pipe(
          map((settings) => loadAppSettingsSuccess({ settings })),
          catchError((error) => {
            if (error instanceof AppSettingsNotFoundError) {
              return of(createSettingsDefaults());
            }
            return of(
              generalAppSettingsFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to load settings",
              }),
            );
          }),
        ),
      ),
    ),
  );

  readonly createSettingsDefaults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createSettingsDefaults),
      switchMap(() =>
        this.appSettingsDatabase.add(DEFAULT_SETTINGS).pipe(
          map((settings) => createSettingsDefaultsSuccess({ settings })),
          catchError((error) =>
            of(
              generalAppSettingsFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to create default settings",
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly updateAppSettings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateAppSettings),
      concatMap((input) =>
        this.appSettingsDatabase.update(input.newSettings).pipe(
          map((settings) => updateAppSettingsSuccess({ settings })),
          catchError((error) =>
            of(
              generalAppSettingsFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to update settings",
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly generalAppSettingsFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(generalAppSettingsFailure),
        exhaustMap(({ error }) =>
          this.dialogs
            .open(error, {
              label: "Settings error",
              size: "s",
            })
            .pipe(catchError(() => EMPTY)),
        ),
      ),
    { dispatch: false },
  );
}

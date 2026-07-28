import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { AppSettingsRepository } from "../../data/repositories/app-settings-repository";
import { catchError, EMPTY, exhaustMap, map, of, switchMap } from "rxjs";
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
        this.appSettingsDatabase
          .get()
          .pipe(map((settings) => loadAppSettingsSuccess({ settings }))),
      ),
      catchError((error) => {
        if (error instanceof AppSettingsNotFoundError) {
          return of(createSettingsDefaults());
        }
        return of(
          loadAppSettingsFailure({
            error:
              error instanceof Error
                ? error.message
                : "Unable to load settings",
          }),
        );
      }),
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
              createSettingsDefaultsFailure({
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

  readonly createSettingsDefaultFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(createSettingsDefaultsFailure),
        exhaustMap((message) =>
          this.dialogs
            .open(message.error, {
              label: "Fatal error",
              size: "s",
            })
            .pipe(catchError(() => EMPTY)),
        ),
      ),
    { dispatch: false },
  );

  readonly updateAppSettings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateAppSettings),
      switchMap((input) =>
        this.appSettingsDatabase
          .update(input.newSettings)
          .pipe(map((settings) => updateAppSettingsSuccess({ settings }))),
      ),
      catchError((error) =>
        of(
          updateAppSettingsFailure({
            error:
              error instanceof Error
                ? error.message
                : "Unable to load settings",
          }),
        ),
      ),
    ),
  );

  readonly updateAppSettingsFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateAppSettingsFailure),
        exhaustMap((message) =>
          this.dialogs
            .open(message.error, {
              label: "Fatal error",
              size: "s",
            })
            .pipe(catchError(() => EMPTY)),
        ),
      ),
    { dispatch: false },
  );

  readonly loadAppSettingsFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loadAppSettingsFailure),
        exhaustMap((message) =>
          this.dialogs
            .open(message.error, {
              label: "Fatal error",
              size: "s",
            })
            .pipe(catchError(() => EMPTY)),
        ),
      ),
    { dispatch: false },
  );
}

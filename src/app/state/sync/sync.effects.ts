import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, defer, EMPTY, exhaustMap, map, of } from "rxjs";
import { SYNC_PROVIDER } from "../../core/data/CONST";
import {
  connectSync,
  connectSyncFailure,
  connectSyncSuccess,
  synchronize,
  synchronizeConnectionRequired,
  synchronizeSuccess,
} from "./sync.actions";
import { TuiDialogService, TuiNotificationService } from "@taiga-ui/core";

@Injectable()
export class SyncEffects {
  private readonly actions$ = inject(Actions);
  private readonly syncProvider = inject(SYNC_PROVIDER);
  private readonly dialogs = inject(TuiDialogService);
  private readonly notifications = inject(TuiNotificationService);

  readonly connect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(connectSync),

      exhaustMap(() =>
        defer(() => this.syncProvider.connect()).pipe(
          map(() => connectSyncSuccess()),

          catchError((error: unknown) =>
            of(
              connectSyncFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to connect to synchronization provider",
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly synchronize$ = createEffect(() =>
    this.actions$.pipe(
      ofType(synchronize),

      exhaustMap(() => {
        if (!this.syncProvider.isConnected()) {
          return of(synchronizeConnectionRequired());
        }

        // Temporary until exchange() is implemented.
        return of(synchronizeSuccess());
      }),
    ),
  );

  readonly showConnectionRequired$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(synchronizeConnectionRequired),

        exhaustMap(() =>
          this.dialogs
            .open(
              "Connect synchronization from the Settings menu before syncing.",
              {
                label: "Synchronization not connected",
                size: "s",
              },
            )
            .pipe(catchError(() => EMPTY)),
        ),
      ),
    { dispatch: false },
  );

  readonly showSynchronizationSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(synchronizeSuccess),

        exhaustMap(() =>
          this.notifications
            .open("", {
              label: "Synchronization complete",
              appearance: "positive",
              size: "s",
              autoClose: 2_000,
              closable: false,
              inline: "center",
            })
            .pipe(catchError(() => EMPTY)),
        ),
      ),
    { dispatch: false },
  );
}

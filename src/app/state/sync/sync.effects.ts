import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, defer, exhaustMap, map, of } from "rxjs";
import { SYNC_PROVIDER } from "../../core/data/CONST";
import {
  connectSync,
  connectSyncFailure,
  connectSyncSuccess,
  synchronize,
  synchronizeFailure,
  synchronizeSuccess,
} from "./sync.actions";

@Injectable()
export class SyncEffects {
  private readonly actions$ = inject(Actions);
  private readonly syncProvider = inject(SYNC_PROVIDER);

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

      exhaustMap(() =>
        defer(() => this.syncProvider.connect()).pipe(
          // Temporary endpoint:
          // the real exchange pipeline will replace this map.
          map(() => synchronizeSuccess()),

          catchError((error: unknown) =>
            of(
              synchronizeFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to synchronize",
              }),
            ),
          ),
        ),
      ),
    ),
  );
}

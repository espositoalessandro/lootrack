import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import {
  catchError,
  concatMap,
  defer,
  EMPTY,
  exhaustMap,
  map,
  of,
  switchMap,
} from "rxjs";
import { SYNC_PROVIDER } from "../../core/models/CONST";
import {
  connectSync,
  connectSyncFailure,
  connectSyncSuccess,
  loadPendingChanges,
  loadPendingChangesFailure,
  loadPendingChangesSuccess,
  resolveSyncConflict,
  resolveSyncConflictFailure,
  resolveSyncConflictSuccess,
  synchronize,
  synchronizeConflictFailure,
  synchronizeConnectionRequired,
  synchronizeFailure,
  synchronizeSuccess,
} from "./sync.actions";
import { TuiDialogService, TuiNotificationService } from "@taiga-ui/core";
import { SyncEngine } from "../../core/sync/sync-engine";
import { SyncRunConflictError } from "../../core/models/errors";
import {
  addCategorySuccess,
  deleteCategorySuccess,
  loadCategories,
  updateCategorySuccess,
} from "../categories/categories.actions";
import {
  addTransactionSuccess,
  deleteTransactionSuccess,
  loadTransactions,
  updateTransactionSuccess,
} from "../transactions/transactions.actions";
import { PendingChangesService } from "../../core/services/pending-changes.service";
import { ConflictResolutionService } from "../../core/services/conflict-resolution.service";

@Injectable()
export class SyncEffects {
  private readonly actions$ = inject(Actions);
  private readonly syncProvider = inject(SYNC_PROVIDER);
  private readonly dialogs = inject(TuiDialogService);
  private readonly notifications = inject(TuiNotificationService);
  private readonly syncEngine = inject(SyncEngine);
  private readonly pendingChangesService = inject(PendingChangesService);
  private readonly conflictService = inject(ConflictResolutionService);

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
                    : "Unable to connect to synchronization providers",
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

        return defer(() => this.syncEngine.synchronize()).pipe(
          map(() => synchronizeSuccess()),

          catchError((error: unknown) => {
            if (error instanceof SyncRunConflictError) {
              return of(
                synchronizeConflictFailure({
                  conflicts: error.conflicts,
                }),
              );
            }

            return of(
              synchronizeFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Synchronization failed",
              }),
            );
          }),
        );
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

  readonly reloadLocalStateAfterSync$ = createEffect(() =>
    this.actions$.pipe(
      ofType(synchronizeSuccess, resolveSyncConflictSuccess),
      concatMap(() => [
        loadTransactions(),
        loadCategories(),
        loadPendingChanges(),
      ]),
    ),
  );

  readonly refreshPendingChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        addTransactionSuccess,
        updateTransactionSuccess,
        deleteTransactionSuccess,
        addCategorySuccess,
        updateCategorySuccess,
        deleteCategorySuccess,
      ),
      map(() => loadPendingChanges()),
    ),
  );

  readonly loadPendingChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPendingChanges),

      switchMap(() =>
        this.pendingChangesService.getAll().pipe(
          map((pendingChanges) =>
            loadPendingChangesSuccess({
              pendingChanges,
            }),
          ),

          catchError((error: unknown) =>
            of(
              loadPendingChangesFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to load pending changes",
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly resolveConflict$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resolveSyncConflict),
      concatMap(({ conflict, resolution }) =>
        this.conflictService.resolve(conflict, resolution).pipe(
          map(() =>
            resolveSyncConflictSuccess({
              entityType: conflict.entityType,
              entityId: conflict.entityId,
            }),
          ),
          catchError((error: unknown) =>
            of(
              resolveSyncConflictFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to resolve conflict",
              }),
            ),
          ),
        ),
      ),
    ),
  );
}

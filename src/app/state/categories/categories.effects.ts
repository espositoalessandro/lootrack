import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
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
  addCategory,
  addCategorySuccess,
  deleteCategory,
  deleteCategoryBlocked,
  deleteCategorySuccess,
  generalCategoriesFailure,
  loadCategories,
  loadCategoriesSuccess,
  saveCategoryBlocked,
  updateCategory,
  updateCategorySuccess,
} from "./categories.actions";
import { CategoriesRepository } from "../../data/repositories/categories-repository";
import {
  CategoryAlreadyExistsError,
  CategoryInUseError,
  CategoryTransactionAssignmentError,
  CategoryTypeChangeBlockedError,
} from "../../data/errors";
import { TuiDialogService } from "@taiga-ui/core";

@Injectable()
export class CategoriesEffects {
  private readonly actions$ = inject(Actions);
  private readonly dialogs = inject(TuiDialogService);
  private readonly categoriesDatabase = inject(CategoriesRepository);

  readonly loadCategories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCategories),

      switchMap(() =>
        this.categoriesDatabase.getActive().pipe(
          map((categories) => loadCategoriesSuccess({ categories })),

          catchError((error: unknown) =>
            of(
              generalCategoriesFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to load categories",
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly addCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addCategory),

      concatMap(({ category }) =>
        this.categoriesDatabase.add(category).pipe(
          map((result) =>
            addCategorySuccess({
              category: result.category,
              transactions: result.transactions,
            }),
          ),

          catchError((error: Error) => {
            if (
              error instanceof CategoryTransactionAssignmentError ||
              error instanceof CategoryAlreadyExistsError
            ) {
              return of(
                saveCategoryBlocked({
                  message: error.message,
                }),
              );
            }
            return of(
              generalCategoriesFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to add category",
              }),
            );
          }),
        ),
      ),
    ),
  );

  readonly deleteCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteCategory),
      concatMap(({ id }) =>
        this.categoriesDatabase.remove(id).pipe(
          map(() => deleteCategorySuccess({ id })),
          catchError((error: unknown) => {
            if (error instanceof CategoryInUseError) {
              return of(
                deleteCategoryBlocked({
                  id,
                  transactionCount: error.transactionCount,
                }),
              );
            }
            return of(
              generalCategoriesFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to delete category",
              }),
            );
          }),
        ),
      ),
    ),
  );

  readonly updateCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateCategory),

      concatMap(({ id, changes }) =>
        this.categoriesDatabase.update(id, changes).pipe(
          map((result) =>
            updateCategorySuccess({
              updatedCategory: result.category,
              transactions: result.transactions,
            }),
          ),

          catchError((error: unknown) => {
            if (
              error instanceof CategoryTransactionAssignmentError ||
              error instanceof CategoryAlreadyExistsError ||
              error instanceof CategoryTypeChangeBlockedError
            ) {
              return of(
                saveCategoryBlocked({
                  message: error.message,
                }),
              );
            }

            return of(
              generalCategoriesFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to update category",
              }),
            );
          }),
        ),
      ),
    ),
  );

  readonly showDeleteCategoryBlockedDialog$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(deleteCategoryBlocked),

        exhaustMap(({ transactionCount }) =>
          this.dialogs
            .open(
              `This category is linked to ${transactionCount} active ${
                transactionCount === 1 ? "transaction" : "transactions"
              }. Reassign or delete them before deleting the category.`,
              {
                label: "Category cannot be deleted",
                size: "s",
              },
            )
            .pipe(catchError(() => EMPTY)),
        ),
      ),
    { dispatch: false },
  );

  readonly showCreateCategoryBlockedDialog$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(saveCategoryBlocked),

        exhaustMap((message) =>
          this.dialogs
            .open(message.message, {
              label: "Category cannot be saved",
              size: "s",
            })
            .pipe(catchError(() => EMPTY)),
        ),
      ),
    { dispatch: false },
  );

  readonly showGeneralCategoryError$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(generalCategoriesFailure),

        exhaustMap((error) =>
          this.dialogs
            .open(error, {
              label: "Error in category operation",
              size: "s",
            })
            .pipe(catchError(() => EMPTY)),
        ),
      ),
    { dispatch: false },
  );
}

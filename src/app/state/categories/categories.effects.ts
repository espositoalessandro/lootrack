import { inject, Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, concatMap, map, of, switchMap } from "rxjs";

import {
  addCategory,
  addCategoryFailure,
  addCategorySuccess,
  deleteCategory,
  deleteCategoryFailure,
  deleteCategorySuccess,
  loadCategories,
  loadCategoriesFailure,
  loadCategoriesSuccess,
  updateCategory,
  updateCategoryFailure,
  updateCategorySuccess,
} from "./categories.actions";
import { CategoriesRepository } from "../../data/categories-repository";

@Injectable()
export class CategoriesEffects {
  private readonly actions$ = inject(Actions);

  private readonly categoriesDatabase = inject(CategoriesRepository);

  readonly loadCategories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCategories),

      switchMap(() =>
        this.categoriesDatabase.getActive().pipe(
          map((categories) => loadCategoriesSuccess({ categories })),

          catchError((error: unknown) =>
            of(
              loadCategoriesFailure({
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
          map((newCategory) => addCategorySuccess({ category: newCategory })),

          catchError((error: unknown) =>
            of(
              addCategoryFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to add category",
              }),
            ),
          ),
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
          catchError((error: unknown) =>
            of(
              deleteCategoryFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to delete category",
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly updateCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateCategory),

      concatMap(({ id, name }) =>
        this.categoriesDatabase.updateName(id, name).pipe(
          map((category) =>
            updateCategorySuccess({
              updatedCategory: category,
            }),
          ),

          catchError((error: unknown) =>
            of(
              updateCategoryFailure({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to update category",
              }),
            ),
          ),
        ),
      ),
    ),
  );
}

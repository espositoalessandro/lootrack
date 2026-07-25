import { createAction, props } from "@ngrx/store";

import type { AddCategory, Category } from "../../data/models";

// RETRIEVES

export const loadCategories = createAction("[Categories Page] Load Requested");

export const loadCategoriesSuccess = createAction(
  "[Categories Database] Load Succeeded",
  props<{ categories: Category[] }>(),
);

export const loadCategoriesFailure = createAction(
  "[Categories Database] Load Failed",
  props<{ error: string }>(),
);

// ADD

export const addCategory = createAction(
  "[New Category Page] Add Requested",
  props<{ category: AddCategory }>(),
);

export const addCategorySuccess = createAction(
  "[Categories Database] Add Succeeded",
  props<{ category: Category }>(),
);

export const addCategoryFailure = createAction(
  "[Categories Database] Add Failed",
  props<{ error: string }>(),
);

// DELETES

export const deleteCategory = createAction(
  "[Category Item] Delete Requested",
  props<{ id: string }>(),
);

export const deleteCategorySuccess = createAction(
  "[Categories Database] Delete Succeeded",
  props<{ id: string }>(),
);

export const deleteCategoryFailure = createAction(
  "[Categories Database] Delete Failed",
  props<{ error: string }>(),
);

// UPDATES

export const updateCategory = createAction(
  "[Category Item] Update Requested",
  props<{ id: string; name: string }>(),
);

export const updateCategorySuccess = createAction(
  "[Categories Database] Update Succeeded",
  props<{ updatedCategory: Category }>(),
);

export const updateCategoryFailure = createAction(
  "[Categories Database] Update Failed",
  props<{ error: string }>(),
);

// ERRORS

export const deleteCategoryBlocked = createAction(
  "[Categories Database] Delete Blocked",
  props<{
    id: string;
    transactionCount: number;
  }>(),
);

export const createCategoryBlocked = createAction(
  "[Categories Database] Create Blocked",
  props<{ message: string }>(),
);

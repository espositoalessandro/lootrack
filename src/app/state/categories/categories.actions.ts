import { createAction, props } from "@ngrx/store";

import type {
  AddCategory,
  Category,
  Transaction,
  UpdateCategory,
} from "../../core/models/models";

// RETRIEVES

export const loadCategories = createAction("[Categories] Load Requested");

export const loadCategoriesSuccess = createAction(
  "[Categories Database] Load Succeeded",
  props<{ categories: Category[] }>(),
);

export const loadCategoriesFailure = createAction(
  "[Categories Database] Load Failed",
  props<{ error: string }>(),
);

export const generalCategoriesFailure = createAction(
  "[Categories Database] Categories error",
  props<{ error: string }>(),
);

// ADD

export const addCategory = createAction(
  "[Category] Add Requested",
  props<{ category: AddCategory }>(),
);

export const addCategorySuccess = createAction(
  "[Categories Database] Add Succeeded",
  props<{ category: Category; transactions?: Transaction[] }>(),
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
  "[Category Sheet] Update Requested",
  props<{
    id: string;
    changes: UpdateCategory;
  }>(),
);

export const updateCategorySuccess = createAction(
  "[Categories Database] Update Succeeded",
  props<{
    updatedCategory: Category;
    transactions?: Transaction[];
  }>(),
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

export const saveCategoryBlocked = createAction(
  "[Categories Database] Save Blocked",
  props<{ message: string }>(),
);

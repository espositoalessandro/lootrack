import { createReducer, on } from "@ngrx/store";

import type { Category } from "../../core/data/models";
import {
  addCategory,
  addCategoryFailure,
  addCategorySuccess,
  deleteCategory,
  deleteCategoryBlocked,
  deleteCategoryFailure,
  deleteCategorySuccess,
  generalCategoriesFailure,
  loadCategories,
  loadCategoriesFailure,
  loadCategoriesSuccess,
  saveCategoryBlocked,
  updateCategory,
  updateCategoryFailure,
  updateCategorySuccess,
} from "./categories.actions";

export interface CategoriesState {
  items: Category[];
  loading: boolean;
  error: string | null;
}

export const initialCategoriesState: CategoriesState = {
  items: [],
  loading: false,
  error: null,
};

export const categoriesReducer = createReducer(
  initialCategoriesState,

  on(loadCategories, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(loadCategoriesSuccess, (state, { categories }) => ({
    ...state,
    items: categories,
    loading: false,
    error: null,
  })),

  on(loadCategoriesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(addCategory, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(addCategorySuccess, (state, { category }) => ({
    ...state,
    items: [category, ...state.items],
    loading: false,
    error: null,
  })),

  on(addCategoryFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(deleteCategory, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(deleteCategorySuccess, (state, { id }) => ({
    ...state,
    items: state.items.filter((category) => category.id !== id),
    loading: false,
    error: null,
  })),

  on(deleteCategoryFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(updateCategory, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(updateCategorySuccess, (state, { updatedCategory }) => ({
    ...state,
    items: state.items.map((item) =>
      item.id === updatedCategory.id ? updatedCategory : item,
    ),
    loading: false,
    error: null,
  })),

  on(updateCategoryFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(deleteCategoryBlocked, (state) => ({
    ...state,
    loading: false,
    error: null,
  })),

  on(saveCategoryBlocked, (state) => ({
    ...state,
    loading: false,
    error: null,
  })),

  on(generalCategoriesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
);

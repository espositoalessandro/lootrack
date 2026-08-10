import { createSelector } from "@ngrx/store";
import { selectTransactionsLoading } from "./transactions/transactions.selector";
import { selectCategoryLoading } from "./categories/categories.selector";
import { selectAppSettingsLoading } from "./app-settings/app-settings.selector";

export const isAppLoading = createSelector(
  selectTransactionsLoading,
  selectCategoryLoading,
  selectAppSettingsLoading,
  (
    transactionLoading: boolean,
    categoryLoading: boolean,
    appSettingsLoading: boolean,
  ) => transactionLoading || categoryLoading || appSettingsLoading,
);

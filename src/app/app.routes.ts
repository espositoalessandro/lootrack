import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./features/home/home").then((m) => m.Home),
  },
  {
    path: "new-transactions",
    outlet: "sheet",
    loadComponent: () =>
      import("./features/new-transaction/new-transaction").then(
        (m) => m.NewTransaction,
      ),
  },
  {
    path: "new-category",
    outlet: "sheet",
    loadComponent: () =>
      import("./features/new-category/new-category").then((m) => m.NewCategory),
  },
  {
    path: "edit-category/:id",
    outlet: "sheet",
    loadComponent: () =>
      import("./features/new-category/new-category").then((m) => m.NewCategory),
  },
  {
    path: "list",
    loadComponent: () =>
      import("./features/transaction-list/transaction-list").then(
        (m) => m.TransactionList,
      ),
    data: { header: { title: "Transactions" } },
  },
  {
    path: "categories",
    loadComponent: () =>
      import("./features/categories/categories").then((m) => m.Categories),
    data: {
      header: {
        title: "Categories",
        leading: "back",
      },
    },
  },
  {
    path: "edit-transaction/:id",
    outlet: "sheet",
    loadComponent: () =>
      import("./features/new-transaction/new-transaction").then(
        (m) => m.NewTransaction,
      ),
  },
  {
    path: "pending-changes",
    loadComponent: () =>
      import("./features/pending-changes/pending-changes").then(
        (m) => m.PendingChanges,
      ),
    data: {
      header: {
        title: "Pending",
        leading: "back",
      },
    },
  },
  {
    path: "**",
    redirectTo: "",
  },
];

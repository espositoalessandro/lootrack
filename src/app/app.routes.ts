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
    path: "list",
    loadComponent: () =>
      import("./features/transaction-list/transaction-list").then(
        (m) => m.TransactionList,
      ),
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
    path: "**",
    redirectTo: "",
  },
];

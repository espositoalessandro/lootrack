import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./features/home/home").then((m) => m.Home),
  },
  {
    path: "**",
    redirectTo: "",
  },
  {
    path: "newTransaction",
    loadComponent: () =>
      import("./features/new-transaction/new-transaction").then(
        (m) => m.NewTransaction,
      ),
  },
];

import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./features/home/home").then((m) => m.Home),
  },
  {
    path: "new-transaction",
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

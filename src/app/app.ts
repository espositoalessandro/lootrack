import {
  TUI_DARK_MODE,
  TuiLoader,
  TuiRoot,
  TuiScrollRef,
} from "@taiga-ui/core";
import { Component, effect, inject, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Store } from "@ngrx/store";

import { FloatingFooter } from "./layout/floating-footer/floating-footer";
import { loadCategories } from "./state/categories/categories.actions";
import { loadTransactions } from "./state/transactions/transactions.actions";
import { FloatingHeader } from "./layout/floating-header/floating-header";
import {
  loadAppSettings,
  updateAppSettings,
} from "./state/app-settings/app-settings.actions";
import { selectAppSettings } from "./state/app-settings/app-settings.selector";
import { synchronize } from "./state/sync/sync.actions";
import { TuiPullToRefresh } from "@taiga-ui/addon-mobile";
import { isAppLoading } from "./state/global.selector";

@Component({
  selector: "app-root",
  imports: [
    RouterOutlet,
    TuiRoot,
    FloatingFooter,
    TuiLoader,
    FloatingHeader,
    TuiPullToRefresh,
    TuiScrollRef,
  ],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App implements OnInit {
  private readonly store = inject(Store);
  protected readonly darkMode = inject(TUI_DARK_MODE);

  protected readonly isAppLoading = this.store.selectSignal(isAppLoading);
  protected readonly settings = this.store.selectSignal(selectAppSettings);

  constructor() {
    effect(() => {
      this.darkMode.set(this.settings().theme === "dark");
    });
  }

  ngOnInit(): void {
    void this.initializeApp();
  }

  protected toggleDarkMode(): void {
    const theme = this.settings().theme === "dark" ? "light" : "dark";

    this.store.dispatch(
      updateAppSettings({
        newSettings: { theme },
      }),
    );
  }

  protected requestSynchronization(): void {
    this.store.dispatch(synchronize());
  }

  private async initializeApp(): Promise<void> {
    this.store.dispatch(loadCategories());
    this.store.dispatch(loadTransactions());
    this.store.dispatch(loadAppSettings());
  }
}

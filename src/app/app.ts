import { TUI_DARK_MODE, TuiLoader, TuiRoot } from "@taiga-ui/core";
import { AsyncPipe } from "@angular/common";
import { Component, computed, inject, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Store } from "@ngrx/store";

import { DevDatabaseSeeder } from "./dev/dev-database-seeder.service";
import { FloatingFooter } from "./layout/floating-footer/floating-footer";
import { loadCategories } from "./state/categories/categories.actions";
import { loadTransactions } from "./state/transactions/transactions.actions";
import { selectTransactionsLoading } from "./state/transactions/transactions.selector";
import { FloatingHeader } from "./layout/floating-header/floating-header";
import {
  loadAppSettings,
  loadAppSettingsSuccess,
  updateAppSettings,
} from "./state/app-settings/app-settings.actions";
import { selectAppSettings } from "./state/app-settings/app-settings.selector";
import { Actions, ofType } from "@ngrx/effects";

@Component({
  selector: "app-root",
  imports: [
    RouterOutlet,
    TuiRoot,
    FloatingFooter,
    AsyncPipe,
    TuiLoader,
    FloatingHeader,
  ],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App implements OnInit {
  private readonly store = inject(Store);
  private readonly databaseSeeder = inject(DevDatabaseSeeder);
  private readonly actions$ = inject(Actions);
  protected readonly darkMode = inject(TUI_DARK_MODE);

  protected readonly transactionsLoading$ = this.store.select(
    selectTransactionsLoading,
  );

  protected readonly settings = this.store.selectSignal(selectAppSettings);

  protected readonly isDarkMode = computed(() => {
    return this.settings()?.theme === "dark";
  });

  ngOnInit(): void {
    void this.initializeApp();
    console.log(this.settings());
    this.actions$.pipe(ofType(loadAppSettingsSuccess)).subscribe(() => {
      this.darkMode.set(this.isDarkMode());
    });
  }

  protected toggleDarkMode(): void {
    this.store.dispatch(updateAppSettings({ newSettings: { theme: "light" } }));
  }

  private async initializeApp(): Promise<void> {
    try {
      await this.databaseSeeder.seed();
    } catch (error) {
      console.error("Unable to seed development database", error);
    }

    this.store.dispatch(loadCategories());
    this.store.dispatch(loadTransactions());
    this.store.dispatch(loadAppSettings());
  }
}
